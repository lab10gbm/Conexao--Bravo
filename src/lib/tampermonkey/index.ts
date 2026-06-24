import { getVacationExtractorString } from './extractors/vacation';
import { getPersonalDataExtractorString } from './extractors/personal';

export const buildUnifiedTampermonkeyScript = (appUrl: string) => {
    // These constants will be embedded in the Tampermonkey script
    const projectId = 'ai-studio-applet-webapp-33cfe';
    const apiKey = 'AIzaSyB46AKE1I7nke459STRmIZ--bURelU3rNY';
    const dbId = 'ai-studio-4572982c-0772-4965-98e3-8ccd137a6b92';
    const finalAppUrl = appUrl.endsWith('/') ? appUrl.slice(0, -1) : appUrl;
    const appDomain = new URL(finalAppUrl).hostname;

    return `// ==UserScript==
// @name         Sincronizador Universal DGP CBMERJ
// @namespace    http://tampermonkey.net/
// @version      3.0
// @description  Suite Completa DGP - Sincronização de Férias, Pessoal, etc. (Botão Flutuante)
// @author       10º GBM
// @match        *://cbmerj.rj.gov.br/*
// @match        *://*.cbmerj.rj.gov.br/*
// @grant        GM_xmlhttpRequest
// @grant        unsafeWindow
// @connect      \${appDomain}
// @connect      firestore.googleapis.com
// @connect      ais-pre-zrzalylqdof6lo5c3vm2nd-725468355119.us-east1.run.app
// @connect      ais-dev-zrzalylqdof6lo5c3vm2nd-725468355119.us-east1.run.app
// @connect      *
// ==/UserScript==

(function() {
    'use strict';

    // Evita duplicatas limitando a injeção ao frame principal ou top window
    if (window.top !== window.self) {
        if (!['corpo', 'main', 'frame_principal'].includes(window.name)) return;
    } else {
        if (document.body && document.body.tagName.toLowerCase() === 'frameset') return;
    }

    try {
        const fixGlobals = (win) => { win.over="over"; win.out="out"; };
        fixGlobals(window);
        const script = document.createElement('script');
        script.textContent = 'window.over="over"; window.out="out"; try{for(let i=0;i<window.frames.length;i++){window.frames[i].window.over="over"; window.frames[i].window.out="out";}}catch(e){}';
        if (document.documentElement) document.documentElement.appendChild(script);
    } catch(e) {}

    const APP_URL = '${finalAppUrl}';
    const FIREBASE_PROJECT_ID = '${projectId}';
    const FIREBASE_API_KEY = '${apiKey}';
    const FIREBASE_DB_ID = '${dbId}';

    const extractors = [
        ${getVacationExtractorString()},
        ${getPersonalDataExtractorString()}
    ];

    function createUI() {
        if (document.getElementById('sync-dgp-container-universal')) return;
        if (!document.body) return; // Aguarda o body existir
        
        let container = document.createElement('div');
        container.id = 'sync-dgp-container-universal';
        container.style.position = 'fixed';
        container.style.bottom = '20px';
        container.style.right = '20px';
        container.style.zIndex = '2147483647';
        container.style.display = 'flex';
        container.style.flexDirection = 'column';
        container.style.alignItems = 'flex-end';
        container.style.gap = '10px';
        container.style.fontFamily = 'Arial, sans-serif';

        let menu = document.createElement('div');
        menu.style.display = 'none';
        menu.style.flexDirection = 'column';
        menu.style.gap = '8px';
        menu.style.backgroundColor = '#fff';
        menu.style.padding = '10px';
        menu.style.borderRadius = '12px';
        menu.style.boxShadow = '0 5px 15px rgba(0,0,0,0.3)';
        menu.style.border = '2px solid #334155';
        
        let title = document.createElement('div');
        title.innerText = 'Suite de Sincronização';
        title.style.fontSize = '12px';
        title.style.fontWeight = 'bold';
        title.style.color = '#64748b';
        title.style.borderBottom = '1px solid #e2e8f0';
        title.style.paddingBottom = '6px';
        title.style.marginBottom = '4px';
        title.style.textAlign = 'center';
        menu.appendChild(title);

        // Dynamically add buttons for each extractor
        extractors.forEach(ext => {
            let btnSync = document.createElement('button');
            btnSync.innerText = ext.label;
            btnSync.style.padding = '10px 15px';
            btnSync.style.backgroundColor = ext.color || '#334155';
            btnSync.style.color = '#fff';
            btnSync.style.border = 'none';
            btnSync.style.borderRadius = '8px';
            btnSync.style.fontWeight = 'bold';
            btnSync.style.cursor = 'pointer';
            btnSync.style.fontSize = '14px';
            btnSync.style.transition = 'opacity 0.2s';
            btnSync.style.width = '100%';
            
            btnSync.onmouseover = () => btnSync.style.opacity = '0.85';
            btnSync.onmouseout = () => btnSync.style.opacity = '1';

            btnSync.onclick = async () => {
                menu.style.display = 'none';
                try {
                    await ext.action(btnSync);
                } catch (e) {
                    console.error('Erro na ação do extrator:', e);
                    alert("Erro interno na extração.");
                    btnSync.disabled = false;
                    btnSync.innerText = ext.label;
                }
            };
            menu.appendChild(btnSync);
        });

        let fab = document.createElement('div');
        fab.innerHTML = '⚙️';
        fab.title = 'Universal Sync DGP';
        fab.style.width = '60px';
        fab.style.height = '60px';
        fab.style.borderRadius = '30px';
        fab.style.backgroundColor = '#334155';
        fab.style.color = 'white';
        fab.style.display = 'flex';
        fab.style.alignItems = 'center';
        fab.style.justifyContent = 'center';
        fab.style.fontSize = '28px';
        fab.style.cursor = 'grab';
        fab.style.boxShadow = '0 6px 15px rgba(0,0,0,0.4)';
        fab.style.userSelect = 'none';
        fab.style.transition = 'transform 0.2s';

        fab.onmouseover = () => { if (!isDragging) fab.style.transform = 'scale(1.05)'; };
        fab.onmouseout = () => { if (!isDragging) fab.style.transform = 'scale(1)'; };

        let isDragging = false;
        let startX, startY, initialX, initialY;

        fab.onmousedown = function(e) {
            e.preventDefault();
            startX = e.clientX;
            startY = e.clientY;
            initialX = container.offsetLeft;
            initialY = container.offsetTop;
            isDragging = false;
            fab.style.cursor = 'grabbing';
            fab.style.transform = 'scale(0.95)';
            document.addEventListener('mousemove', mouseMove);
            document.addEventListener('mouseup', mouseUp);
        };

        function mouseMove(e) {
            let dx = e.clientX - startX;
            let dy = e.clientY - startY;
            if (Math.abs(dx) > 3 || Math.abs(dy) > 3) {
                isDragging = true;
                menu.style.display = 'none';
            }
            container.style.right = 'auto'; 
            container.style.bottom = 'auto';
            container.style.left = (initialX + dx) + 'px';
            container.style.top = (initialY + dy) + 'px';
        }

        function mouseUp() {
            document.removeEventListener('mousemove', mouseMove);
            document.removeEventListener('mouseup', mouseUp);
            fab.style.cursor = 'grab';
            fab.style.transform = 'scale(1)';
            
            if (!isDragging) {
                menu.style.display = menu.style.display === 'none' ? 'flex' : 'none';
            }
            setTimeout(() => isDragging = false, 50);
        }

        container.appendChild(menu);
        container.appendChild(fab);
        document.body.appendChild(container);
    }

    // Intervalo reduzido para checar existência
    setInterval(createUI, 2000);
})();`;
};

// Also export the bookmarklet generator if we still want to support it
export const buildUnifiedBookmarkletScript = () => {
    return `javascript:(function(){alert('Por favor, utilize o script Tampermonkey para a Suite Universal.');})();`;
};
