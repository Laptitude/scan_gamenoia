import { initIA, analyserImage } from './app.js';

const dropZone = document.getElementById('drop-zone');
const fileInput = document.getElementById('fileInput');
const preview = document.getElementById('preview');
const statusText = document.getElementById('status');
const resultsDiv = document.getElementById('results');
const rowsWrapper = document.getElementById('rows-wrapper');

// Mettre à jour l'affichage textuel du statut
function updateStatus(message, showLoader = true) {
    statusText.innerHTML = showLoader ? `<span class="loader"></span>${message}` : message;
}

// Démarrage de l'application
initIA(updateStatus);

// Gestion du clic sur la zone
dropZone.addEventListener('click', () => fileInput.click());

// Drag & Drop animations
['dragenter', 'dragover'].forEach(eventName => {
    dropZone.addEventListener(eventName, (e) => { e.preventDefault(); dropZone.classList.add('hover'); }, false);
});
['dragleave', 'drop'].forEach(eventName => {
    dropZone.addEventListener(eventName, (e) => { e.preventDefault(); dropZone.classList.remove('hover'); }, false);
});

// Capture du fichier déposé ou sélectionné
dropZone.addEventListener('drop', (e) => handleFiles(e.dataTransfer.files));
fileInput.addEventListener('change', (e) => handleFiles(e.target.files));

function handleFiles(files) {
    if (files.length === 0) return;
    const file = files[0]; // Correction ici : ajout de index 0 pour cibler le premier fichier
    
    const reader = new FileReader();
    reader.onload = function(event) {
        preview.src = event.target.result;
        preview.style.display = 'inline-block';
        process(event.target.result);
    };
    reader.readAsDataURL(file);
}

// Lancement du calcul et affichage
async function process(imageSrc) {
    resultsDiv.style.display = 'none';
    
    const topResults = await analyserImage(imageSrc, (msg) => updateStatus(msg, true));
    
    if (!topResults) {
        updateStatus("Erreur lors de l'analyse.", false);
        return;
    }

    updateStatus("Analyse terminée !", false);
    rowsWrapper.innerHTML = '';
    resultsDiv.style.display = 'block';

    topResults.forEach(jeu => {
        const pourcentage = Math.max(0, Math.min(100, (jeu.score * 100))).toFixed(1);
        
        const row = document.createElement('div');
        row.className = 'game-row';
        row.innerHTML = `
            <div class="game-name"><span>${jeu.nom}</span><span>${pourcentage}%</span></div>
            <div class="progress-bar"><div class="progress-fill" style="width: ${pourcentage}%"></div></div>
        `;
        rowsWrapper.appendChild(row);
    });
}
