import fs from 'fs';

let code = fs.readFileSync('src/components/VacationImporter.tsx', 'utf8');

// The original map returns a single { update: { ... } } object.
// We want to turn them into flatMaps to return both.
const mapRegex = /let writes = ([a-zA-Z0-9_]+)\.map\(([a-zA-Z_]+) => \{[\s\n]*let docId = /g;

code = code.replace(/let writes = ([a-zA-Z0-9_]+)\.map\(([a-zA-Z_]+) => \{([\s\S]*?)return \{ *update: \{ *name: "projects\/" \+ projectId \+ "\/databases\/" \+ dbId \+ "\/documents\/vacations\/" \+ docId[\s\S]*?\} *\} *\};[\s\n]*\}\);/g, (match, arr, v, inner) => {
    // Extract the fields inner part from the match.
    // It's inside fields: { ... }
    
    return `let writes = ${arr}.flatMap(${v} => {
${inner}
        const fieldsObj = { id: { stringValue: docId }, militarRg: { stringValue: ${v}.militarRg }, ato: { stringValue: ${v}.ato || 'Concessão' }, anoRef: { stringValue: ${v}.anoRef || '' }, dataInicio: { stringValue: ${v}.dataInicio || '' }, dataRetorno: { stringValue: ${v}.dataRetorno || '' }, boletim: { stringValue: ${v}.boletim || '' }, boletimOrigem: { stringValue: ${v}.boletimOrigem || '' }, diasGozados: { integerValue: String(${v}.diasGozados || 0) }, diasAGozar: { integerValue: String(${v}.diasAGozar || 0) }, status: { stringValue: ${v}.status || 'gozado' }, updatedAt: { timestampValue: new Date().toISOString() } };
        let write1 = { update: { name: "projects/" + projectId + "/databases/" + dbId + "/documents/vacations/" + docId, fields: fieldsObj } };
        let write2 = { update: { name: "projects/" + projectId + "/databases/" + dbId + "/documents/militaries/" + ${v}.militarRg + "/ferias/" + docId, fields: fieldsObj } };
        return [write1, write2];
    });`;
});

// For the first detailed map
const firstMapRegex = /let writes = vacations\.map\(v => \{[\s\n]*let docId = [^\n]+\n[\s]*return \{[\s\n]*update: \{[\s\n]*name: "projects\/" \+ projectId \+ "\/databases\/" \+ dbId \+ "\/documents\/vacations\/" \+ docId,[\s\S]*?\}[\s\n]*\}[\s\n]*\};[\s\n]*\}\);/g;
code = code.replace(firstMapRegex, `let writes = vacations.flatMap(v => {
                 let docId = v.militarRg + '_' + (v.anoRef || '0000') + '_' + (v.dataInicio || '').replace(/\\//g, '');
                 const fieldsObj = {
                              id: { stringValue: docId },
                              militarRg: { stringValue: v.militarRg },
                              ato: { stringValue: v.ato || 'Concessão' },
                              anoRef: { stringValue: v.anoRef || '' },
                              dataInicio: { stringValue: v.dataInicio || '' },
                              dataRetorno: { stringValue: v.dataRetorno || '' },
                              boletim: { stringValue: v.boletim || '' },
                              boletimOrigem: { stringValue: v.boletimOrigem || '' },
                              diasGozados: { integerValue: String(v.diasGozados || 0) },
                              diasAGozar: { integerValue: String(v.diasAGozar || 0) },
                              status: { stringValue: v.status || 'gozado' },
                              updatedAt: { timestampValue: new Date().toISOString() }
                 };
                 return [
                     { update: { name: "projects/" + projectId + "/databases/" + dbId + "/documents/vacations/" + docId, fields: fieldsObj } },
                     { update: { name: "projects/" + projectId + "/databases/" + dbId + "/documents/militaries/" + v.militarRg + "/ferias/" + docId, fields: fieldsObj } }
                 ];
             });`);


fs.writeFileSync('src/components/VacationImporter.tsx', code);
