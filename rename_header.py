with open("src/components/EstudoTecnicoGuarnicoesModule.tsx", "r") as f:
    content = f.read()

content = content.replace("Estudo Técnico das Guarnições (Lacunas / Dia)", "Previsão Algorítmica (Lacunas Plurianual)")

with open("src/components/EstudoTecnicoGuarnicoesModule.tsx", "w") as f:
    f.write(content)
