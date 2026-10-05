#!/bin/bash
sed -i '/const \[grdDays/a \  const [rasDays, setRasDays] = useState<Record<string, boolean>>({});' ./src/components/CalendarHighlights.tsx

sed -i '/const unsubGrd = onSnapshot(docRef/i \
    // --- RAS INTEGRATION ---\
    const oppsQuery = query(collection(db, "ras_opportunities"), where("obm", "==", obmContext));\
    const appsQuery = query(collection(db, "ras_applications"), where("militarRg", "==", userCleanRg));\
    let oppsCache: any[] = [];\
    let appsCache: any[] = [];\
    const updateRasDays = () => {\
       const newRasDays: Record<string, boolean> = {};\
       appsCache.forEach(app => {\
         if (app.status === "selected" || app.status === "completed") {\
            const opp = oppsCache.find(o => o.id === app.rasId);\
            if (opp && opp.date) {\
               newRasDays[opp.date] = true;\
            }\
         }\
       });\
       setRasDays(newRasDays);\
    };\
    const unsubOpps = onSnapshot(oppsQuery, (snap) => {\
       oppsCache = snap.docs.map(d => ({ id: d.id, ...d.data() }));\
       updateRasDays();\
    });\
    const unsubApps = onSnapshot(appsQuery, (snap) => {\
       appsCache = snap.docs.map(d => ({ id: d.id, ...d.data() }));\
       updateRasDays();\
    });\
    // -----------------------' ./src/components/CalendarHighlights.tsx

sed -i '/return () => {/a \      unsubOpps();\
      unsubApps();' ./src/components/CalendarHighlights.tsx

sed -i 's/const isGrd = grdDays\[dateStr\];/const isGrd = grdDays[dateStr] || rasDays[dateStr];/g' ./src/components/CalendarHighlights.tsx
