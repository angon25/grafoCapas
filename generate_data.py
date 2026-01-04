import json
import random

countries = ["Colombia", "Perú", "Panamá", "Chile"]
tiers = ["High", "Mid", "Low"]
app_prefixes = ["Fin", "Health", "Edu", "Agro", "Logi", "Pay", "Sec", "Net", "Data", "Cloud"]
app_suffixes = ["Track", "Soft", "App", "Sys", "Net", "Hub", "Link", "Flow", "Guard", "Sync"]
names = ["Alice", "Bob", "Charlie", "David", "Eva", "Frank", "Grace", "Henry", "Ivy", "Jack", "Kevin", "Luna", "Mario", "Nora", "Oscar", "Pepito", "Quinn", "Rosa", "Sam", "Tom"]

nodes = []
for i in range(1, 51):
    country = random.choice(countries)
    tier = random.choice(tiers)
    app_name = random.choice(app_prefixes) + random.choice(app_suffixes) + str(random.randint(1, 99))
    responsible = random.choice(names) + " " + random.choice(["Smith", "Garcia", "Perez", "Rodriguez", "Gomez"])
    
    nodes.append({
        "id": str(i),
        "country": country,
        "application": app_name,
        "responsible": responsible,
        "tier": tier
    })

links = []
existing_links = set()
integration_types = ["Automática", "Manual"]
frequencies = ["Online", "T menos 15 min", "T menos un día", "Último mes"]

for _ in range(60):
    source = random.choice(nodes)["id"]
    target = random.choice(nodes)["id"]
    
    if source != target and (source, target) not in existing_links:
        # Determine attributes
        integ_type = random.choice(integration_types)
        
        # 70% chance for "T menos un día"
        rand_freq = random.random()
        if rand_freq < 0.7:
            freq = "T menos un día"
        else:
            freq = random.choice([f for f in frequencies if f != "T menos un día"])

        links.append({
            "source": source, 
            "target": target,
            "type": integ_type,
            "frequency": freq
        })
        existing_links.add((source, target))

data = {"nodes": nodes, "links": links}

with open("data.json", "w") as f:
    json.dump(data, f, indent=2)

print("data.json generated with 50 nodes and 60 links.")
