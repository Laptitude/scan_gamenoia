// 1. Une seule et unique importation propre tout en haut
import { pipeline, env } from 'https://unpkg.com';

// Configuration pour forcer l'utilisation des modèles distants
env.allowLocalModels = false;
env.remoteObjectURL = 'https://huggingface.co';

let visionPipeline = null;
let databaseIndex = [];

// 2. Initialiser le modèle d'IA au démarrage
export async function initIA(onStatusUpdate) {
    try {
        onStatusUpdate("Connexion aux serveurs d'IA... (Téléchargement du modèle)");
        
        // Chargement du modèle de vision CLIP avec suivi du pourcentage
        visionPipeline = await pipeline('feature-extraction', 'Xenova/clip-vit-base-patch32', {
            progress_callback: (progress) => {
                if (progress.status === 'downloading') {
                    onStatusUpdate(`Téléchargement de l'IA : ${Math.round(progress.loaded / progress.total * 100)}%`);
                }
            }
        });
        
        onStatusUpdate("Chargement de la base de données locale...");
        await loadDatabase();
        
        onStatusUpdate("Prêt ! Déposez une image.", false);
    } catch (error) {
        console.error("Détail de l'erreur :", error);
        onStatusUpdate("⚠️ Échec de connexion ou blocage réseau.", false);
    }
}

// 3. Charger la base de données des signatures de jeux
async function loadDatabase() {
    try {
        const response = await fetch('./jeux_embeddings.json');
        if (!response.ok) throw new Error("Fichier jeux_embeddings.json introuvable.");
        databaseIndex = await response.json();
    } catch (e) {
        console.warn("Fichier JSON non trouvé. Utilisation de données de test.");
        databaseIndex = [
            { nom: "Minecraft", vecteur: new Array(512).fill(0.01) },
            { nom: "GTA V", vecteur: new Array(512).fill(0.05) },
            { nom: "Zelda: Breath of the Wild", vecteur: new Array(512).fill(-0.02) }
        ];
    }
}

// 4. Calcul de similarité cosinus
function cosineSimilarity(vecA, vecB) {
    let dotProduct = 0.0;
    let normA = 0.0;
    let normB = 0.0;
    for (let i = 0; i < vecA.length; i++) {
        dotProduct += vecA[i] * vecB[i];
        normA += vecA[i] * vecA[i];
        normB += vecB[i] * vecB[i];
    }
    return dotProduct / (Math.sqrt(normA) * Math.sqrt(normB));
}

// 5. Analyser la photo de l'utilisateur
export async function analyserImage(imageSrc, onStatusUpdate) {
    if (!visionPipeline) return null;
    
    onStatusUpdate("Analyse des pixels et extraction de la signature...");
    
    const output = await visionPipeline(imageSrc);
    const userVector = Array.from(output.data);

    onStatusUpdate("Comparaison instantanée avec la base de données...");
    
    const resultats = databaseIndex.map(jeu => {
        const score = cosineSimilarity(userVector, jeu.vecteur);
        return { nom: jeu.nom, score: score };
    });

    resultats.sort((a, b) => b.score - a.score);
    return resultats.slice(0, 3); // Retourne le Top 3
}
