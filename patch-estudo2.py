import re

with open('src/components/EscalaEspelhoModule.tsx', 'r') as f:
    content = f.read()

# Update loop to correctly process categories in render
content = re.sub(
    r"\{dynamicRequirements.filter\(f => \{\s*const isOperacional = f\.category !== 'admin';\s*if \(\!isOperacional\) return false;",
    "{dynamicRequirements.filter(f => {\n                      const isOperacional = f.category !== 'admin';\n                      if (!isOperacional) return false;",
    content
)

with open('src/components/EscalaEspelhoModule.tsx', 'w') as f:
    f.write(content)

