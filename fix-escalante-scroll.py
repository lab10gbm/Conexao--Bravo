import re

with open('src/components/EscalanteDashboard.tsx', 'r') as f:
    content = f.read()

# Replace min-h-screen back to flex flex-col or just keep it without height constraints
content = content.replace('min-h-screen', '')

# Remove 'flex-1' and 'overflow-hidden' and 'relative' and 'absolute inset-0 overflow-y-auto' 
# This might be tricky with regex, let's just do targeted replacements:
content = content.replace(
    'className="flex-1 bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden flex flex-col relative"',
    'className="bg-white rounded-3xl border border-slate-200 shadow-sm flex flex-col"'
)
content = content.replace(
    'className="flex-1 bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden flex flex-col relative p-6"',
    'className="bg-white rounded-3xl border border-slate-200 shadow-sm flex flex-col p-6"'
)
content = content.replace(
    'className="flex-1 overflow-hidden flex flex-col relative"',
    'className="flex flex-col"'
)
content = content.replace(
    'className="flex-1 bg-slate-50 rounded-3xl border border-slate-200 shadow-sm overflow-hidden flex flex-col relative justify-center items-center"',
    'className="bg-slate-50 rounded-3xl border border-slate-200 shadow-sm flex flex-col justify-center items-center"'
)

# For inner wrappers
content = content.replace('className="absolute inset-0 overflow-y-auto"', 'className="w-full"')
content = content.replace('className="absolute inset-0 overflow-y-auto overflow-x-hidden p-2 sm:p-6"', 'className="w-full p-2 sm:p-6"')
content = content.replace('className="absolute inset-0 overflow-y-auto p-6"', 'className="w-full p-6"')
content = content.replace('className="absolute inset-0 overflow-hidden"', 'className="w-full"')
content = content.replace('className="absolute inset-0 overflow-y-auto custom-scrollbar pr-2"', 'className="w-full pr-2"')
content = content.replace('className="absolute inset-0 overflow-y-auto w-full h-full flex justify-center bg-slate-900 sm:rounded-3xl"', 'className="w-full flex justify-center bg-slate-900 sm:rounded-3xl"')
content = content.replace('className="absolute inset-0 overflow-y-auto w-full h-full p-4 sm:p-6"', 'className="w-full p-4 sm:p-6"')

with open('src/components/EscalanteDashboard.tsx', 'w') as f:
    f.write(content)

