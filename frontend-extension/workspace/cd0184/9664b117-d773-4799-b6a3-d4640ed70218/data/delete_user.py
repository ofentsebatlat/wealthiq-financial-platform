import pickle
import os
import getpass

DB_PATH = "user_database.pkl"

def load_database():
    if not os.path.exists(DB_PATH):
        return {}
    with open(DB_PATH, "rb") as f:
        try:
            return pickle.load(f)
        except Exception:
            return {}

def save_database(db):
    with open(DB_PATH, "wb") as f:
        pickle.dump(db, f)

def main():
    db = load_database()

    if not db:
        print("No users registered in the database.")
        return

    print("=== Registered Users ===")
    users = list(db.keys())
    for i, name in enumerate(users, start=1):
        print(f"  {i}. {name}")

    print()
    username = input("Enter the username to delete: ").strip()

    if username not in db:
        print(f"User '{username}' not found.")
        return

    # Confirm with PIN for security
    pin_attempt = getpass.getpass(f"Enter PIN for '{username}' to confirm deletion: ").strip()
    if pin_attempt != db[username]["pin"]:
        print("❌ Incorrect PIN. Deletion cancelled.")
        return

    confirm = input(f"Are you sure you want to delete '{username}'? (yes/no): ").strip().lower()
    if confirm != "yes":
        print("Deletion cancelled.")
        return

    del db[username]
    save_database(db)
    print(f"\n✅ User '{username}' has been deleted successfully.")

    if db:
        print("\nRemaining users:")
        for name in db:
            print(f"  - {name}")
    else:
        print("The database is now empty.")

if __name__ == "__main__":
    main()
