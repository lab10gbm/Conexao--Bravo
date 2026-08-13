with open("src/components/EscalaEspelhoModule.tsx", "r") as f:
    content = f.read()

content = content.replace("Estudo Técnico (Lacunas)", "Previsão Algorítmica")

with open("src/components/EscalaEspelhoModule.tsx", "w") as f:
    f.write(content)
