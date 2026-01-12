import csv
import json
import os

def run_import():
    # File paths
    nodes_file = 'nodos.csv'
    links_file = 'arcos.csv'
    output_file = 'data.json'

    # Check if files exist
    if not os.path.exists(nodes_file) or not os.path.exists(links_file):
        print(f"Error: {nodes_file} or {links_file} not found.")
        return

    nodes = []
    links = []

    # Function to read with fallback encoding
    def read_csv(filename):
        encodings = ['utf-8', 'cp850', 'latin-1']
        for encoding in encodings:
            try:
                with open(filename, mode='r', encoding=encoding) as f:
                    # Read all to check encoding
                    return list(csv.DictReader(f, delimiter=';'))
            except UnicodeDecodeError:
                continue
            except Exception as e:
                print(f"Error reading {filename} with {encoding}: {e}")
                return []
        print(f"Failed to read {filename} with supported encodings.")
        return []

    # Function to parse list-like strings e.g. "[A, B, C]"
    def parse_list_string(s):
        if not s:
            return []
        s = s.strip()
        if s.startswith('[') and s.endswith(']'):
            s = s[1:-1]
        if not s:
            return []
        return [item.strip() for item in s.split(',')]

    # Frequency mapping for icons
    freq_mapping = {
        "Online": "Online",
        "Diario": "T menos un día",
        "Mensual": "Último mes",
        "15 minutos": "T menos 15 min"
    }

    # Read Nodes
    nodes_data = read_csv(nodes_file)
    for row in nodes_data:
        try:
             # Map columns to English keys
            node = {
                "id": row.get("id"),
                "project": row.get("Proyecto"),
                "layer": row.get("label"),
                "name": row.get("nombre"),
                "name_secondary": row.get("nombre2"),
                "app_code": row.get("codigoAplicacion"),
                "contact": row.get("contacto"),
                "email": row.get("emailContacto"),
                "responsible": row.get("responsable"),
                "country": row.get("pais"),
                "businessUnit": parse_list_string(row.get("negocio")), # Changed to camelCase and parsed list
                "format": row.get("formato"),
                "technology": row.get("tecnologia"),
                "data_owner": row.get("dataOwner"),
                "cypher_query": row.get("cypher"),
                
                # Core fields for visualization
                "application": row.get("nombre"),
                "type": row.get("formato"),
                "tier": "Mid"
            }
            nodes.append(node)
        except Exception as e:
             print(f"Error processing node row: {e}")

    # Read Links
    links_data = read_csv(links_file)
    for row in links_data:
        try:
            # Map columns to English keys
            freq_label = row.get("frecuencia")
            mapped_freq = freq_mapping.get(freq_label, freq_label) # Fallback to original if not found

            link = {
                "id": row.get("id"),
                "source": row.get("Nodo origen"),
                "target": row.get("Nodo destino"),
                "frequency_code": row.get("Tipo relacion"),
                "frequency": mapped_freq,
                "detail": row.get("detalle"),
                "flow_id": row.get("id_flujo"),
                "flow_description": row.get("descripcion_flujo"),
                "flow_sequence": row.get("secuencia_flujo"),
                "cypher_query": row.get("cypher"),

                # Core fields for visualization
                "type": row.get("detalle"), 
            }
            links.append(link)
        except Exception as e:
            print(f"Error processing link row: {e}")



    # Construct final data object
    data = {
        "nodes": nodes,
        "links": links
    }

    # Write to data.json
    try:
        with open(output_file, 'w', encoding='utf-8') as f:
            json.dump(data, f, indent=2, ensure_ascii=False)
        print(f"Successfully generated {output_file} with {len(nodes)} nodes and {len(links)} links.")
    except Exception as e:
        print(f"Error writing to {output_file}: {e}")

if __name__ == "__main__":
    run_import()
