  const [rasDays, setRasDays] = useState<Record<string, boolean>>({});

  useEffect(() => {
    if (!obmContext || !userRg) return;
    const userCleanRg = normalizeRg(userRg);
    
    // Subscribe to all opportunities for this OBM
    const oppsQuery = query(collection(db, 'ras_opportunities'), where('obm', '==', obmContext));
    
    // Subscribe to user's applications
    const appsQuery = query(collection(db, 'ras_applications'), where('militarRg', '==', userCleanRg));
    
    let oppsCache: any[] = [];
    let appsCache: any[] = [];
    
    const updateRasDays = () => {
       const newRasDays: Record<string, boolean> = {};
       
       // user is in RAS if they have an application that is 'selected' (or 'applied'?) 
       // Usually they are scheduled if 'selected'.
       appsCache.forEach(app => {
         if (app.status === 'selected' || app.status === 'completed') {
            const opp = oppsCache.find(o => o.id === app.rasId);
            if (opp && opp.date) {
               newRasDays[opp.date] = true;
            }
         }
       });
       
       setRasDays(newRasDays);
    };

    const unsubOpps = onSnapshot(oppsQuery, (snap) => {
       oppsCache = snap.docs.map(d => ({ id: d.id, ...d.data() }));
       updateRasDays();
    });
    
    const unsubApps = onSnapshot(appsQuery, (snap) => {
       appsCache = snap.docs.map(d => ({ id: d.id, ...d.data() }));
       updateRasDays();
    });
    
    return () => {
      unsubOpps();
      unsubApps();
    };
  }, [obmContext, userRg, month]);
