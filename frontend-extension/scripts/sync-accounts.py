import json
import os

db_path = r"wealthiq-capitec-extension (2)\users_database.json"
profile_path = r"wealthiq-capitec-extension (2)\security_profile.json"

with open(db_path, "r", encoding="utf-8") as f:
    db = json.load(f)

ofentse_photo = db.get("Ofentse", {}).get("userFacePhoto", "") or db.get("Ofentse Batlang", {}).get("userFacePhoto", "")
bokang_photo = db.get("Bokang Khakhau", {}).get("userFacePhoto", "")

ofentse_account = {
    "userName": "Ofentse Batlang",
    "userPin": "1234",
    "userFacePhoto": ofentse_photo,
    "startingBalance": 36546.55,
    "userEmail": "ofentsebatlang@gmail.com",
    "userPhone": "0786976181",
    "isSecurityRegistered": True,
    "accountNumber": "1431289445",
    "accountType": "Global One Account",
    "idNumber": "940615 5123 08 1",
    "dateOfBirth": "June 15, 1994",
    "enrollmentDate": "July 1, 2026",
    "isFrozen": False,
    "userPinHash": "12f287ee6545a1bad323e28b7ec8fa74882dae58e831d091d47c8a8e1a599c74"
}

bokang_account = {
    "userName": "Bokang Khakhau",
    "userPin": "2025",
    "userFacePhoto": bokang_photo,
    "startingBalance": 80000,
    "userEmail": "khakhaumoepeng@gmail.com",
    "userPhone": "0710894216",
    "idNumber": "050622 5216 08 9",
    "dateOfBirth": "June 22, 2005",
    "accountNumber": "1602309986",
    "accountType": "Global One Transactional",
    "enrollmentDate": "November 5, 2026",
    "isSecurityRegistered": True,
    "isFrozen": False,
    "userPinHash": "6b9f05897102d18f60a58c134b3e1c4cb3bc7a6e61b27d6f036e420dc76464a0"
}

# In users_database.json, ofentse and ofentse batlang are the SAME account
new_db = {
    "Ofentse Batlang": ofentse_account,
    "Ofentse": {
        **ofentse_account,
        "userName": "Ofentse"
    },
    "Bokang Khakhau": bokang_account
}

with open(db_path, "w", encoding="utf-8") as f:
    json.dump(new_db, f, indent=2)

with open(profile_path, "w", encoding="utf-8") as f:
    json.dump(ofentse_account, f, indent=2)

print("Updated users_database.json and security_profile.json successfully.")

