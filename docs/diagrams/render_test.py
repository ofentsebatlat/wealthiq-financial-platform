import os
import subprocess

html_content = """<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <script src="mermaid.min.js"></script>
    <style>
        body { margin: 20px; background: white; font-family: sans-serif; }
        .mermaid { display: flex; justify-content: center; }
    </style>
</head>
<body>
    <div class="mermaid">
    graph TD
        A[Client Web App] -->|HTTPS| B(Node.js Express Gateway)
        B --> C[(ACID Document Store)]
        B --> D[Python CV Microservice]
    </div>
    <script>
        mermaid.initialize({ startOnLoad: true, theme: 'neutral' });
    </script>
</body>
</html>"""

html_path = os.path.abspath("documentation/diagrams/test.html")
with open(html_path, "w", encoding="utf-8") as f:
    f.write(html_content)

out_png = os.path.abspath("documentation/diagrams/test.png")
chrome = r"C:\Program Files\Google\Chrome\Application\chrome.exe"
file_url = "file:///" + html_path.replace("\\", "/")
cmd = [
    chrome, "--headless=new", "--no-sandbox", "--disable-gpu",
    "--virtual-time-budget=5000",
    f"--screenshot={out_png}",
    file_url
]
res = subprocess.run(cmd, capture_output=True, text=True, timeout=10)
print("Returncode:", res.returncode)
print("PNG exists:", os.path.exists(out_png))
if os.path.exists(out_png):
    print("PNG size:", os.path.getsize(out_png))

