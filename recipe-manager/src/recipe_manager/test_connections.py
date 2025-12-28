import asyncio
from recipe_manager.services.turso import TursoClient
from recipe_manager.services.usda import USDAClient
from rich.console import Console

console = Console()

async def main():
    console.print("\n[bold cyan]🔄 Testing Connections...[/bold cyan]\n")

    # 1. Test USDA
    usda = USDAClient()
    console.print("[yellow]Testing USDA API...[/yellow]")
    success, message = await usda.test_connection()
    if success:
        console.print(f"[green]✅ USDA Connected: {message}[/green]")
    else:
        console.print(f"[red]❌ USDA Failed: {message}[/red]")

    # 2. Test Turso
    turso = TursoClient()
    console.print("\n[yellow]Testing Turso DB...[/yellow]")
    success, message = await turso.test_connection()
    if success:
        console.print(f"[green]✅ Turso Connected: {message}[/green]")
    else:
        console.print(f"[red]❌ Turso Failed: {message}[/red]")

if __name__ == "__main__":
    asyncio.run(main())
