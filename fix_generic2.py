import re
with open('src/components/EscalaEspelhoModule.tsx', 'r') as f:
    content = f.read()

# We need to find the first getSlotDisplayName or wherever it generates the string of functions
# Let's see how it's named.
