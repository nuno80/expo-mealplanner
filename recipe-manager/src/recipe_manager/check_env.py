from .config.settings import Config

def main():
    try:
        Config.validate()
        print("✅ Environment configured correctly!")
        print(f"📦 Turso: {Config.TURSO_URL}")
        print(f"🥦 USDA Key: {'Present' if Config.USDA_KEY else 'Missing'}")
    except Exception as e:
        print(f"❌ Configuration Error: {e}")

if __name__ == "__main__":
    main()
