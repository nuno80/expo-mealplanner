"""
Recipe Manager CLI - Typer-based command interface.
Usage: uv run python -m recipe_manager [COMMAND]
"""
import asyncio
import re
from decimal import Decimal
from typing import Optional
from uuid import uuid4

import typer
from rich.console import Console
from rich.prompt import Confirm, IntPrompt, Prompt
from rich.table import Table
from pathlib import Path
import json

from recipe_manager.models import (
    Category,
    Difficulty,
    Ingredient,
    Recipe,
    RecipeIngredient,
    RecipeStep,
)
from recipe_manager.services.turso import TursoClient
from recipe_manager.services.usda import USDAClient

# ============ App Setup ============

app = typer.Typer(
    name="recipe-manager",
    help="CLI tool for managing NutriPlanIT recipes and ingredients.",
    add_completion=False,
)
ingredient_app = typer.Typer(help="Ingredient management commands")
app.add_typer(ingredient_app, name="ingredient")

console = Console()

# ============ Helpers ============


def slugify(text: str) -> str:
    """Convert text to URL-safe slug."""
    text = text.lower().strip()
    text = re.sub(r"[^\w\s-]", "", text)
    text = re.sub(r"[\s_-]+", "-", text)
    return text


def run_async(coro):
    """Run async function synchronously."""
    return asyncio.get_event_loop().run_until_complete(coro)


# ============ Ingredient Commands ============


@ingredient_app.command("search")
def ingredient_search(
    query: str = typer.Argument(..., help="Search term (e.g., 'pasta', 'chicken')"),
    limit: int = typer.Option(10, "--limit", "-l", help="Number of results"),
):
    """Search USDA FoodData Central for ingredients."""
    console.print(f"\n[cyan]🔍 Searching USDA for '{query}'...[/cyan]\n")

    usda = USDAClient()
    foods = run_async(usda.search_food(query, page_size=limit))

    if not foods:
        console.print("[yellow]No results found.[/yellow]")
        raise typer.Exit()

    table = Table(title=f"USDA Results for '{query}'")
    table.add_column("#", style="dim", width=3)
    table.add_column("FDC ID", style="cyan")
    table.add_column("Description", style="white", max_width=40)
    table.add_column("kcal", justify="right", style="green")
    table.add_column("Protein", justify="right")
    table.add_column("Carbs", justify="right")
    table.add_column("Fat", justify="right")

    for i, food in enumerate(foods, 1):
        table.add_row(
            str(i),
            food.fdc_id,
            food.description[:40],
            str(food.nutrients.kcal),
            f"{food.nutrients.protein}g",
            f"{food.nutrients.carbs}g",
            f"{food.nutrients.fat}g",
        )

    console.print(table)


@ingredient_app.command("add")
def ingredient_add():
    """Add an ingredient to the database (interactive wizard)."""
    console.print("\n[bold cyan]🥕 Add New Ingredient[/bold cyan]\n")

    # Option to search USDA first
    use_usda = Confirm.ask("Search USDA for nutritional data?", default=True)

    usda_food = None
    if use_usda:
        query = Prompt.ask("Search term")
        usda = USDAClient()
        foods = run_async(usda.search_food(query, page_size=5))

        if foods:
            console.print()
            for i, food in enumerate(foods, 1):
                console.print(
                    f"  [cyan]{i}.[/cyan] {food.description} "
                    f"[dim]({food.nutrients.kcal} kcal/100g)[/dim]"
                )
            console.print()

            choice = IntPrompt.ask("Select", default=1)
            if 1 <= choice <= len(foods):
                usda_food = foods[choice - 1]
                console.print(f"[green]✓ Selected: {usda_food.description}[/green]\n")

    # Gather ingredient data
    if usda_food:
        name_en = Prompt.ask("Name (EN)", default=usda_food.description)
        name_it = Prompt.ask("Name (IT)")
        kcal = usda_food.nutrients.kcal
        protein = usda_food.nutrients.protein
        carbs = usda_food.nutrients.carbs
        fat = usda_food.nutrients.fat
        fiber = usda_food.nutrients.fiber
        usda_fdc_id = usda_food.fdc_id
    else:
        name_it = Prompt.ask("Name (IT)")
        name_en = Prompt.ask("Name (EN)")
        kcal = IntPrompt.ask("kcal/100g", default=0)
        protein = Decimal(Prompt.ask("Protein/100g", default="0"))
        carbs = Decimal(Prompt.ask("Carbs/100g", default="0"))
        fat = Decimal(Prompt.ask("Fat/100g", default="0"))
        fiber_str = Prompt.ask("Fiber/100g (optional)", default="")
        fiber = Decimal(fiber_str) if fiber_str else None
        usda_fdc_id = None

    category = Prompt.ask("Category (e.g., cereali, verdure)", default="")
    cooked_factor = Decimal(Prompt.ask("Cooked weight factor", default="1.0"))
    default_unit = Prompt.ask("Default unit", default="g")

    # Create and save
    ingredient = Ingredient(
        id=uuid4(),
        usda_fdc_id=usda_fdc_id,
        name_it=name_it,
        name_en=name_en,
        category=category or None,
        kcal_per_100g=kcal,
        protein_per_100g=protein,
        carbs_per_100g=carbs,
        fat_per_100g=fat,
        fiber_per_100g=fiber,
        cooked_weight_factor=cooked_factor,
        default_unit=default_unit,
    )

    turso = TursoClient()
    try:
        run_async(
            turso.insert_ingredient(
                id=ingredient.id,
                usda_fdc_id=ingredient.usda_fdc_id,
                name_it=ingredient.name_it,
                name_en=ingredient.name_en,
                category=ingredient.category,
                kcal_per_100g=ingredient.kcal_per_100g,
                protein_per_100g=float(ingredient.protein_per_100g),
                carbs_per_100g=float(ingredient.carbs_per_100g),
                fat_per_100g=float(ingredient.fat_per_100g),
                fiber_per_100g=float(ingredient.fiber_per_100g) if ingredient.fiber_per_100g else None,
                cooked_weight_factor=float(ingredient.cooked_weight_factor),
                default_unit=ingredient.default_unit,
            )
        )
        console.print(f"\n[green]✅ Ingredient saved![/green] ID: [cyan]{ingredient.id}[/cyan]")
    except Exception as e:
        console.print(f"\n[red]❌ Error saving ingredient: {e}[/red]")
        raise typer.Exit(1)
    finally:
        run_async(turso.close())


# ============ Recipe Commands ============


@app.command("add")
def recipe_add():
    """Add a new recipe (interactive wizard)."""
    console.print("\n[bold cyan]📝 Add New Recipe[/bold cyan]\n")

    # Basic info
    name_it = Prompt.ask("Name (IT)")
    name_en = Prompt.ask("Name (EN)")
    slug = Prompt.ask("Slug", default=slugify(name_it))

    console.print("\n[dim]Categories: breakfast, lunch, dinner, snack[/dim]")
    category_str = Prompt.ask("Category", default="lunch")
    category = Category(category_str)

    prep_time = IntPrompt.ask("Prep time (min)", default=10)
    cook_time = IntPrompt.ask("Cook time (min)", default=15)
    servings = IntPrompt.ask("Servings", default=2)

    console.print("\n[dim]Difficulty: easy, medium, hard[/dim]")
    difficulty_str = Prompt.ask("Difficulty", default="easy")
    difficulty = Difficulty(difficulty_str)

    description_it = Prompt.ask("Description (IT)", default="")
    description_en = Prompt.ask("Description (EN)", default="")

    # Ingredients
    console.print("\n[bold]🥕 Add Ingredients[/bold] (empty name to finish)\n")
    recipe_ingredients: list[tuple[Ingredient, Decimal, str]] = []
    turso = TursoClient()
    usda = USDAClient()
    order = 0

    while True:
        search_term = Prompt.ask("  Ingredient (search or skip)", default="")
        if not search_term:
            break

        # Search USDA
        foods = run_async(usda.search_food(search_term, page_size=5))
        if foods:
            for i, food in enumerate(foods, 1):
                console.print(
                    f"    [cyan]{i}.[/cyan] {food.description} "
                    f"[dim]({food.nutrients.kcal} kcal)[/dim]"
                )
            choice = IntPrompt.ask("  Select (0 to skip)", default=1)

            if 1 <= choice <= len(foods):
                usda_food = foods[choice - 1]
                quantity = Decimal(Prompt.ask("  Quantity (g)", default="100"))
                unit = Prompt.ask("  Unit", default="g")

                # Create ingredient
                ing = Ingredient(
                    id=uuid4(),
                    usda_fdc_id=usda_food.fdc_id,
                    name_it=Prompt.ask("  Name IT", default=usda_food.description),
                    name_en=usda_food.description,
                    kcal_per_100g=usda_food.nutrients.kcal,
                    protein_per_100g=usda_food.nutrients.protein,
                    carbs_per_100g=usda_food.nutrients.carbs,
                    fat_per_100g=usda_food.nutrients.fat,
                    fiber_per_100g=usda_food.nutrients.fiber,
                )
                recipe_ingredients.append((ing, quantity, unit))
                order += 1
                console.print(f"    [green]✓ Added {ing.name_en}[/green]\n")

    # Calculate total nutrients
    total_weight = sum(float(qty) for _, qty, _ in recipe_ingredients)
    total_kcal = sum(
        ing.kcal_per_100g * float(qty) / 100 for ing, qty, _ in recipe_ingredients
    )
    total_protein = sum(
        float(ing.protein_per_100g) * float(qty) / 100 for ing, qty, _ in recipe_ingredients
    )
    total_carbs = sum(
        float(ing.carbs_per_100g) * float(qty) / 100 for ing, qty, _ in recipe_ingredients
    )
    total_fat = sum(
        float(ing.fat_per_100g) * float(qty) / 100 for ing, qty, _ in recipe_ingredients
    )

    # Per 100g
    if total_weight > 0:
        kcal_per_100g = int(total_kcal * 100 / total_weight)
        protein_per_100g = Decimal(str(round(total_protein * 100 / total_weight, 2)))
        carbs_per_100g = Decimal(str(round(total_carbs * 100 / total_weight, 2)))
        fat_per_100g = Decimal(str(round(total_fat * 100 / total_weight, 2)))
        serving_weight = int(total_weight / servings)
        kcal_per_serving = int(total_kcal / servings)
    else:
        kcal_per_100g = 0
        protein_per_100g = Decimal("0")
        carbs_per_100g = Decimal("0")
        fat_per_100g = Decimal("0")
        serving_weight = 0
        kcal_per_serving = 0

    console.print("\n[bold]📊 Calculated Nutrients (per 100g):[/bold]")
    console.print(f"  kcal: {kcal_per_100g}")
    console.print(f"  protein: {protein_per_100g}g")
    console.print(f"  carbs: {carbs_per_100g}g")
    console.print(f"  fat: {fat_per_100g}g")
    console.print(f"  serving: {serving_weight}g ({kcal_per_serving} kcal)")

    # Steps
    console.print("\n[bold]📋 Add Steps[/bold] (empty to finish)\n")
    steps: list[tuple[str, str]] = []
    step_num = 1

    while True:
        step_it = Prompt.ask(f"  Step {step_num} (IT)", default="")
        if not step_it:
            break
        step_en = Prompt.ask(f"  Step {step_num} (EN)", default="")
        steps.append((step_it, step_en))
        step_num += 1

    # Save everything
    if not Confirm.ask("\nSave recipe?", default=True):
        console.print("[yellow]Cancelled.[/yellow]")
        raise typer.Exit()

    recipe_id = uuid4()

    try:
        # Save ingredients first
        for ing, _, _ in recipe_ingredients:
            run_async(
                turso.insert_ingredient(
                    id=ing.id,
                    usda_fdc_id=ing.usda_fdc_id,
                    name_it=ing.name_it,
                    name_en=ing.name_en,
                    category=ing.category,
                    kcal_per_100g=ing.kcal_per_100g,
                    protein_per_100g=float(ing.protein_per_100g),
                    carbs_per_100g=float(ing.carbs_per_100g),
                    fat_per_100g=float(ing.fat_per_100g),
                    fiber_per_100g=float(ing.fiber_per_100g) if ing.fiber_per_100g else None,
                    cooked_weight_factor=float(ing.cooked_weight_factor),
                    default_unit=ing.default_unit,
                )
            )

        # Save recipe
        run_async(
            turso.insert_recipe(
                id=recipe_id,
                name_it=name_it,
                name_en=name_en,
                slug=slug,
                description_it=description_it or None,
                description_en=description_en or None,
                category=category.value,
                image_url=None,
                prep_time_min=prep_time,
                cook_time_min=cook_time,
                total_time_min=prep_time + cook_time,
                servings=servings,
                difficulty=difficulty.value,
                kcal_per_100g=kcal_per_100g,
                kcal_per_serving=kcal_per_serving,
                protein_per_100g=float(protein_per_100g),
                carbs_per_100g=float(carbs_per_100g),
                fat_per_100g=float(fat_per_100g),
                fiber_per_100g=None,
                serving_weight_g=serving_weight,
                is_published=False,
            )
        )

        # Link ingredients
        for i, (ing, qty, unit) in enumerate(recipe_ingredients):
            run_async(
                turso.insert_recipe_ingredient(
                    id=uuid4(),
                    recipe_id=recipe_id,
                    ingredient_id=ing.id,
                    quantity=float(qty),
                    unit=unit,
                    is_optional=False,
                    notes_it=None,
                    notes_en=None,
                    order=i,
                )
            )

        # Save steps
        for i, (step_it, step_en) in enumerate(steps, 1):
            run_async(
                turso.insert_recipe_step(
                    id=uuid4(),
                    recipe_id=recipe_id,
                    step_number=i,
                    instruction_it=step_it,
                    instruction_en=step_en,
                    image_url=None,
                )
            )

        console.print(f"\n[green]✅ Recipe saved![/green] ID: [cyan]{recipe_id}[/cyan]")

    except Exception as e:
        console.print(f"\n[red]❌ Error saving recipe: {e}[/red]")
        raise typer.Exit(1)
    finally:
        run_async(turso.close())


@app.command("sync")
def sync_data(
    directory: str = typer.Option("recipes_data", "--dir", "-d", help="Directory containing JSON recipes"),
    force: bool = typer.Option(False, "--force", "-f", help="Force overwrite without confirmation"),
):
    """Sync all JSON recipes from a directory to Turso DB."""

    dir_path = Path(directory)
    if not dir_path.exists():
        console.print(f"[red]❌ Directory not found: {directory}[/red]")
        raise typer.Exit(1)

    json_files = list(dir_path.glob("*.json"))
    if not json_files:
        console.print(f"[yellow]No JSON files found in {directory}[/yellow]")
        raise typer.Exit(0)

    console.print(f"\n[cyan]🔄 Syncing {len(json_files)} recipes from '{directory}'...[/cyan]\n")

    turso = TursoClient()
    success_count = 0

    try:
        for file_path in json_files:
            try:
                with open(file_path, "r", encoding="utf-8") as f:
                    data = json.load(f)

                slug = data.get("slug")
                if not slug:
                    console.print(f"[yellow]⚠️  Skipping {file_path.name}: No slug found[/yellow]")
                    continue

                # Check if exists
                existing = run_async(turso.get_recipe_by_slug(slug))
                if existing:
                    if not force:
                        # Optional: could add logic to only update if changed, but full overwrite is safer for now
                        pass

                    # Delete existing
                    from uuid import UUID
                    old_id = UUID(existing["id"])
                    run_async(turso.delete_recipe(old_id))
                    console.print(f"  [dim]Updated: {data.get('name_it')} (replaced)[/dim]")
                else:
                    console.print(f"  [green]New: {data.get('name_it')}[/green]")

                # Insert
                recipe_id = uuid4()

                # Helper to safely float conversion
                def to_float(val, default=0.0):
                    return float(val) if val is not None else default

                # Check for dietary flags
                # Note: Turso schema might not have dietary flags columns yet or handled via tags?
                # Based on previous context, user was adding fields to Pydantic models.
                # Assuming simple mapping for now.

                run_async(
                    turso.insert_recipe(
                        id=recipe_id,
                        name_it=data["name_it"],
                        name_en=data.get("name_en"),
                        slug=slug,
                        description_it=data.get("description_it"),
                        description_en=data.get("description_en"),
                        category=data.get("category", "main_course"),
                        image_url=data.get("image_url"),
                        prep_time_min=data.get("prep_time_min", 0),
                        cook_time_min=data.get("cook_time_min", 0),
                        total_time_min=data.get("prep_time_min", 0) + data.get("cook_time_min", 0),
                        servings=data.get("servings", 2),
                        difficulty=data.get("difficulty", "medium"),
                        kcal_per_100g=data.get("kcal_per_100g", 0),
                        kcal_per_serving=data.get("kcal_per_serving", 0),
                        protein_per_100g=to_float(data.get("protein_per_100g")),
                        carbs_per_100g=to_float(data.get("carbs_per_100g")),
                        fat_per_100g=to_float(data.get("fat_per_100g")),
                        fiber_per_100g=to_float(data.get("fiber_per_100g", 0)),
                        serving_weight_g=data.get("serving_weight_g", 0),
                        protein_source=data.get("protein_source", "mixed"),  # Mediterranean Diet rotation
                        is_published=True, # Published by default from sync
                    )
                )

                # Ingredients
                for i, ing in enumerate(data.get("ingredients", [])):
                    ing_id = uuid4()

                    # Try to reuse existing ingredient if possible?
                    # For now, creating fresh to ensure data consistency with recipe.
                    # Or maybe creating 'recipe-specific' ingredients logic.

                    run_async(
                        turso.insert_ingredient(
                            id=ing_id,
                            usda_fdc_id=None, # Lost in JSON unless stored
                            name_it=ing.get("name_it", ing.get("name")),
                            name_en=ing.get("name_en"),
                            category=None,
                            kcal_per_100g=0,
                            protein_per_100g=0,
                            carbs_per_100g=0,
                            fat_per_100g=0,
                            fiber_per_100g=None,
                            cooked_weight_factor=to_float(ing.get("cooking_factor", 1.0)),
                            default_unit=ing.get("unit", "g"),
                        )
                    )

                    run_async(
                        turso.insert_recipe_ingredient(
                            id=uuid4(),
                            recipe_id=recipe_id,
                            ingredient_id=ing_id,
                            quantity=to_float(ing.get("quantity")),
                            unit=ing.get("unit", "g"),
                            is_optional=ing.get("is_optional", False),
                            notes_it=ing.get("notes_it"),
                            notes_en=ing.get("notes_en"),
                            order=i,
                        )
                    )

                # Steps
                for i, step in enumerate(data.get("steps", []), 1):
                    # Handle both string steps and object steps
                    if isinstance(step, dict):
                        instr_it = step.get("instruction_it")
                        instr_en = step.get("instruction_en")
                    else:
                        instr_it = str(step)
                        instr_en = None

                    run_async(
                        turso.insert_recipe_step(
                            id=uuid4(),
                            recipe_id=recipe_id,
                            step_number=i,
                            instruction_it=instr_it,
                            instruction_en=instr_en,
                            image_url=None,
                        )
                    )

                success_count += 1

            except Exception as e:
                console.print(f"[red]❌ Failed to sync {file_path.name}: {e}[/red]")

    except Exception as general_e:
        console.print(f"[red]❌ General error: {general_e}[/red]")
        raise typer.Exit(1)
    finally:
        run_async(turso.close())

    console.print(f"\n[bold green]✅ Synced {success_count}/{len(json_files)} recipes.[/bold green]")


@app.command("list")
def recipe_list(
    category: Optional[str] = typer.Option(None, "--category", "-c", help="Filter by category"),
):
    """List all recipes in the database."""
    console.print("\n[cyan]📖 Recipes[/cyan]\n")

    turso = TursoClient()
    try:
        recipes = run_async(turso.get_recipes(category))

        if not recipes:
            console.print("[yellow]No recipes found.[/yellow]")
            raise typer.Exit(0)

        table = Table()
        table.add_column("Name", style="white", max_width=30)
        table.add_column("Category", style="cyan")
        table.add_column("kcal/100g", justify="right", style="green")
        table.add_column("Time", justify="right")
        table.add_column("Difficulty", style="dim")

        for r in recipes:
            table.add_row(
                r.get("name_it", "?"),
                r.get("category", "?"),
                str(r.get("kcal_per_100g", 0)),
                f"{r.get('total_time_min', 0)} min",
                r.get("difficulty", "?"),
            )

        console.print(table)

    except typer.Exit:
        raise  # Let typer.Exit pass through
    except Exception as e:
        error_msg = str(e)
        if "no such table" in error_msg.lower():
            console.print("[yellow]⚠️  Database tables not found.[/yellow]")
            console.print("[dim]Run Drizzle migrations from the Expo app first:[/dim]")
            console.print("[dim]  cd .. && pnpm drizzle-kit push[/dim]")
        else:
            console.print(f"[red]❌ Error: {e}[/red]")
        raise typer.Exit(1)
    finally:
        run_async(turso.close())


@app.command("delete")
def recipe_delete(
    recipe_id: str = typer.Argument(..., help="Recipe ID (UUID) to delete"),
):
    """Delete a recipe and all its related data."""
    from uuid import UUID as UUIDType

    console.print(f"\n[cyan]🗑️  Deleting recipe...[/cyan]\n")

    turso = TursoClient()
    try:
        # Validate UUID
        try:
            uuid_obj = UUIDType(recipe_id)
        except ValueError:
            console.print(f"[red]❌ Invalid UUID: {recipe_id}[/red]")
            raise typer.Exit(1)

        # Find recipe first
        recipe = run_async(turso.get_recipe_by_id(uuid_obj))
        if not recipe:
            console.print(f"[yellow]Recipe not found: {recipe_id}[/yellow]")
            raise typer.Exit(1)

        console.print(f"[bold]Recipe:[/bold] {recipe.get('name_it', '?')}")
        console.print(f"[dim]Category: {recipe.get('category', '?')} | kcal/100g: {recipe.get('kcal_per_100g', 0)}[/dim]\n")

        if not Confirm.ask("Delete this recipe?", default=False):
            console.print("[yellow]Cancelled.[/yellow]")
            raise typer.Exit(0)

        # Delete recipe and related data
        run_async(turso.delete_recipe(uuid_obj))
        console.print(f"\n[green]✅ Recipe deleted![/green]")

    except typer.Exit:
        raise
    except Exception as e:
        console.print(f"[red]❌ Error: {e}[/red]")
        raise typer.Exit(1)
    finally:
        run_async(turso.close())


# ============ Import Commands ============


@app.command("import-url")
def import_url(
    url: str = typer.Argument(..., help="Recipe URL (SOSCuisine, GialloZafferano, etc.)"),
):
    """Import recipe from a supported website URL."""
    from recipe_manager.services.scraper import scrape_url
    from recipe_manager.services.parser import ParsedRecipe

    console.print(f"\n[cyan]🌐 Fetching recipe from URL...[/cyan]\n")

    try:
        recipe = run_async(scrape_url(url))
    except Exception as e:
        console.print(f"[red]❌ Failed to scrape URL: {e}[/red]")
        raise typer.Exit(1)

    if not recipe or not recipe.name_it:
        console.print("[red]❌ Could not parse recipe from URL[/red]")
        raise typer.Exit(1)

    _show_parsed_recipe_preview(recipe)
    _save_parsed_recipe(recipe)


@app.command("import-text")
def import_text():
    """Import recipe from pasted text (multiline input)."""
    from recipe_manager.services.parser import parse_full_recipe_text

    console.print("\n[bold cyan]📋 Paste Recipe Text[/bold cyan]")
    console.print("[dim]Paste the recipe text, then type 'END' on a new line and press Enter.[/dim]\n")

    lines = []

    while True:
        try:
            line = input()
            # Check for END terminator (case insensitive)
            if line.strip().upper() == "END":
                break
            lines.append(line)
        except EOFError:
            break

    if not lines:
        console.print("[yellow]No text provided.[/yellow]")
        raise typer.Exit(0)

    # Filter out empty lines at start/end but keep internal ones
    text = "\n".join(lines).strip()

    if len(text) < 50:
        console.print(f"[yellow]⚠️  Text seems too short ({len(text)} chars). Did you paste everything?[/yellow]")
        if not Confirm.ask("Continue anyway?", default=False):
            raise typer.Exit(0)

    console.print(f"\n[cyan]🔍 Parsing {len(lines)} lines...[/cyan]\n")

    recipe = parse_full_recipe_text(text)

    if not recipe.name_it:
        console.print("[red]❌ Could not parse recipe from text[/red]")
        raise typer.Exit(1)

    # Validate parsed data
    if recipe.nutrition.kcal == 0 and len(recipe.ingredients) == 0:
        console.print("[yellow]⚠️  No nutrition data or ingredients found![/yellow]")
        console.print("[dim]Make sure the text includes 'Ingredienti' section and nutritional values.[/dim]")
        if not Confirm.ask("Save anyway?", default=False):
            raise typer.Exit(0)

    _show_parsed_recipe_preview(recipe)
    _save_parsed_recipe(recipe)


@app.command("reset")
def reset_db():
    """Delete ALL data from the database (Recipes, Ingredients, Steps)."""
    console.print("\n[bold red]⚠️  DANGER ZONE: DELETE ALL DATA[/bold red]\n")
    if not Confirm.ask("Are you sure you want to delete ALL recipes and ingredients?", default=False):
        console.print("[yellow]Cancelled.[/yellow]")
        raise typer.Exit(0)

    turso = TursoClient()
    try:
        console.print("[dim]Deleting recipe_ingredients...[/dim]")
        run_async(turso.execute("DELETE FROM recipe_ingredients"))

        console.print("[dim]Deleting recipe_steps...[/dim]")
        run_async(turso.execute("DELETE FROM recipe_steps"))

        console.print("[dim]Deleting recipes...[/dim]")
        run_async(turso.execute("DELETE FROM recipes"))

        console.print("[dim]Deleting ingredients...[/dim]")
        run_async(turso.execute("DELETE FROM ingredients"))

        console.print("\n[green]✅ Database cleared![/green]")

    except Exception as e:
        console.print(f"[red]❌ Error: {e}[/red]")
        raise typer.Exit(1)
    finally:
        run_async(turso.close())


@app.command("import-llm")
def import_llm():
    """Import recipe using Gemini LLM for perfect parsing and translation."""
    from recipe_manager.services.llm_parser import parse_recipe_with_llm

    console.print("\n[bold cyan]🤖 LLM Recipe Import (Gemini)[/bold cyan]")
    console.print("[dim]Paste the recipe text, then type 'END' on a new line.[/dim]\n")

    lines = []

    while True:
        try:
            line = input()
            if line.strip().upper() == "END":
                break
            lines.append(line)
        except EOFError:
            break

    if not lines:
        console.print("[yellow]No text provided.[/yellow]")
        raise typer.Exit(0)

    text = "\n".join(lines).strip()

    if len(text) < 50:
        console.print(f"[yellow]⚠️  Text too short ({len(text)} chars).[/yellow]")
        raise typer.Exit(1)

    console.print(f"\n[cyan]🤖 Sending to Gemini... ({len(text)} chars)[/cyan]\n")

    try:
        data = parse_recipe_with_llm(text)
        # Convert dict to ParsedRecipe model
        from recipe_manager.services.llm_parser import llm_result_to_parsed_recipe
        recipe = llm_result_to_parsed_recipe(data)
    except ValueError as e:
        console.print(f"[red]❌ LLM Error: {e}[/red]")
        raise typer.Exit(1)
    except Exception as e:
        console.print(f"[red]❌ API Error: {e}[/red]")
        console.print("[dim]Make sure GEMINI_API_KEY is set in .env[/dim]")
        raise typer.Exit(1)

    _show_parsed_recipe_preview(recipe)
    _save_parsed_recipe(recipe)


def _show_parsed_recipe_preview(recipe):
    """Display preview of parsed recipe."""
    from recipe_manager.services.parser import ParsedRecipe

    console.print(f"[bold green]✓ Parsed: {recipe.name_it}[/bold green]\n")

    # Info table
    info_table = Table(title="Recipe Info", show_header=False)
    info_table.add_column("Field", style="cyan")
    info_table.add_column("Value")

    info_table.add_row("Name", recipe.name_it)
    if recipe.source_url:
        info_table.add_row("Source", recipe.source_url[:50] + "...")
    info_table.add_row("Servings", str(recipe.servings))
    info_table.add_row("Prep Time", f"{recipe.prep_time_min} min")
    info_table.add_row("Cook Time", f"{recipe.cook_time_min} min")
    info_table.add_row("Difficulty", recipe.difficulty)
    info_table.add_row("Tags", ", ".join(recipe.tags) if recipe.tags else "-")

    console.print(info_table)
    console.print()

    # Nutrition
    nut = recipe.nutrition
    console.print(f"[bold]📊 Nutrition (per serving):[/bold]")
    console.print(f"  kcal: {nut.kcal} | protein: {nut.protein}g | carbs: {nut.carbs}g | fat: {nut.fat}g")
    if nut.serving_weight_g:
        console.print(f"  [dim]serving weight: {nut.serving_weight_g}g[/dim]")
    console.print()

    # Ingredients
    console.print(f"[bold]🥕 Ingredients ({len(recipe.ingredients)}):[/bold]")
    for ing in recipe.ingredients[:10]:
        grams_str = f" ({ing.grams}g)" if ing.grams else ""
        console.print(f"  • {ing.quantity} {ing.unit} {ing.name}{grams_str}")
    if len(recipe.ingredients) > 10:
        console.print(f"  [dim]... and {len(recipe.ingredients) - 10} more[/dim]")
    console.print()

    # Steps
    console.print(f"[bold]📋 Steps ({len(recipe.steps)}):[/bold]")
    for i, step in enumerate(recipe.steps[:3], 1):
        console.print(f"  {i}. {step[:80]}...")
    if len(recipe.steps) > 3:
        console.print(f"  [dim]... and {len(recipe.steps) - 3} more[/dim]")
    console.print()


def _save_parsed_recipe(recipe, confirm: bool = True):
    """
    Save parsed recipe to database.
    If confirm=False, skips confirmation prompt and uses default values.
    """
    if confirm:
        if not Confirm.ask("Save this recipe?", default=True):
            console.print("[yellow]Cancelled.[/yellow]")
            raise typer.Exit(0)

        # Determine category from name or default
        category_str = Prompt.ask(
            "Category",
            choices=["breakfast", "main_course", "snack"],
            default=recipe.category or "main_course"
        )
    else:
        # Auto-mode
        category_str = recipe.category or "main_course"

    turso = TursoClient()

    # Check for duplicates by slug
    slug = recipe.slug
    existing = run_async(turso.get_recipe_by_slug(slug))

    if existing:
        console.print(f"\n[yellow]⚠️  Recipe '{recipe.name_it}' (slug: {slug}) already exists![/yellow]")
        if not Confirm.ask("Overwrite existing recipe?", default=False):
            console.print("[yellow]Skipped.[/yellow]")
            return

        # If overwrite confirmed, delete old recipe first
        from uuid import UUID
        old_id = UUID(existing["id"])
        console.print(f"[dim]Deleting old version ({old_id})...[/dim]")
        run_async(turso.delete_recipe(old_id))

    recipe_id = uuid4()

    try:
        # Calculate nutrients per 100g from per-serving
        nut = recipe.nutrition
        if nut.serving_weight_g and nut.serving_weight_g > 0:
            factor = 100 / nut.serving_weight_g
            kcal_per_100g = int(nut.kcal * factor)
            protein_per_100g = round(nut.protein * factor, 2)
            carbs_per_100g = round(nut.carbs * factor, 2)
            fat_per_100g = round(nut.fat * factor, 2)
        else:
            # Estimate: assume 200g per serving
            factor = 100 / 200
            kcal_per_100g = int(nut.kcal * factor)
            protein_per_100g = round(nut.protein * factor, 2)
            carbs_per_100g = round(nut.carbs * factor, 2)
            fat_per_100g = round(nut.fat * factor, 2)

        # Save recipe
        run_async(
            turso.insert_recipe(
                id=recipe_id,
                name_it=recipe.name_it,
                name_en=recipe.name_en or recipe.name_it,
                slug=slugify(recipe.name_it),
                description_it=f"Imported from {recipe.source_url}" if recipe.source_url else None,
                description_en=None,
                category=category_str,
                image_url=None,
                prep_time_min=recipe.prep_time_min,
                cook_time_min=recipe.cook_time_min,
                total_time_min=recipe.prep_time_min + recipe.cook_time_min,
                servings=recipe.servings,
                difficulty=recipe.difficulty,
                kcal_per_100g=kcal_per_100g,
                kcal_per_serving=nut.kcal,
                protein_per_100g=protein_per_100g,
                carbs_per_100g=carbs_per_100g,
                fat_per_100g=fat_per_100g,
                fiber_per_100g=nut.fiber,
                serving_weight_g=nut.serving_weight_g or 200,
                is_published=False,
            )
        )

        # Save ingredients (simplified - just names, no USDA lookup)
        for i, ing in enumerate(recipe.ingredients):
            ing_id = uuid4()

            # Insert ingredient
            run_async(
                turso.insert_ingredient(
                    id=ing_id,
                    usda_fdc_id=None,
                    name_it=ing.name,
                    name_en=ing.name,
                    category=None,
                    kcal_per_100g=0,  # Unknown without USDA lookup
                    protein_per_100g=0,
                    carbs_per_100g=0,
                    fat_per_100g=0,
                    fiber_per_100g=None,
                    cooked_weight_factor=1.0,
                    default_unit=ing.unit,
                )
            )

            # Link to recipe
            run_async(
                turso.insert_recipe_ingredient(
                    id=uuid4(),
                    recipe_id=recipe_id,
                    ingredient_id=ing_id,
                    quantity=ing.grams or ing.quantity,
                    unit=ing.unit if not ing.grams else "g",
                    is_optional=False,
                    notes_it=ing.original_text if ing.original_text != ing.name else None,
                    notes_en=None,
                    order=i,
                )
            )

        # Save steps
        for i, step_text in enumerate(recipe.steps, 1):
            run_async(
                turso.insert_recipe_step(
                    id=uuid4(),
                    recipe_id=recipe_id,
                    step_number=i,
                    instruction_it=step_text,
                    instruction_en=step_text,  # Same for now
                    image_url=None,
                )
            )

        console.print(f"\n[green]✅ Recipe saved![/green] ID: [cyan]{recipe_id}[/cyan]")
        console.print(f"[dim]Ingredients: {len(recipe.ingredients)} | Steps: {len(recipe.steps)}[/dim]")

    except Exception as e:
        console.print(f"\n[red]❌ Error saving: {e}[/red]")
        raise typer.Exit(1)
    finally:
        run_async(turso.close())


@app.command("import-json")
def import_json(
    path: str = typer.Argument(..., help="Path to JSON file or directory containing JSON files"),
):
    """Import recipes from JSON file(s)."""
    import json
    from pathlib import Path
    from recipe_manager.services.llm_parser import llm_result_to_parsed_recipe

    target_path = Path(path)
    files = []

    if target_path.is_file():
        files = [target_path]
    elif target_path.is_dir():
        # Look for .json files
        files = list(target_path.glob("*.json"))
    else:
        console.print(f"[red]❌ Path not found: {path}[/red]")
        raise typer.Exit(1)

    if not files:
        console.print("[yellow]⚠️  No JSON files found.[/yellow]")
        raise typer.Exit(0)

    console.print(f"\n[cyan]📂 Found {len(files)} JSON files. processing...[/cyan]\n")

    success_count = 0
    error_count = 0

    for json_file in files:
        try:
            console.print(f"[dim]Processing {json_file.name}...[/dim]")

            with open(json_file, "r", encoding="utf-8") as f:
                data = json.load(f)

            # Handle list of recipes or single recipe
            data_list = data if isinstance(data, list) else [data]

            for item in data_list:
                # Convert to ParsedRecipe
                try:
                    recipe = llm_result_to_parsed_recipe(item)
                except Exception as e:
                    console.print(f"[red]❌ Parsing error in {json_file.name}: {e}[/red]")
                    error_count += 1
                    continue

                # Check validation
                if not recipe.name_it:
                    console.print(f"[yellow]Skipping {json_file.name}: invalid data[/yellow]")
                    error_count += 1
                    continue

                # Save silently (no prompt)
                try:
                    _save_parsed_recipe(recipe, confirm=False)
                    success_count += 1
                    console.print(f"[green]✓ Imported: {recipe.name_it}[/green]")
                except Exception as e:
                    console.print(f"[red]❌ Save error: {e}[/red]")
                    error_count += 1

        except Exception as e:
            console.print(f"[red]❌ Error reading {json_file.name}: {e}[/red]")
            error_count += 1

    console.print(f"\n[bold]Summary:[/bold]")
    console.print(f"[green]✅ Imported: {success_count}[/green]")
    if error_count > 0:
        console.print(f"[red]❌ Failures: {error_count}[/red]")


# ============ Main ============

if __name__ == "__main__":
    app()
