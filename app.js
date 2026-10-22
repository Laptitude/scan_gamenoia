// Utilisation de la version moderne officielle v4 stabilisée
import { pipeline, env } from 'https://cdn.jsdelivr.net/npm/@huggingface/transformers@4.3.1';

// Forcer la configuration pour le web
env.allowLocalModels = false;
env.useBrowserCache = false; 

let visionPipeline = null;
let databaseIndex = [];

export async function initIA(onStatusUpdate) {
    try {
        onStatusUpdate("Téléchargement du moteur d'IA visuelle...");
        
        // Chargement du modèle CLIP optimisé
        visionPipeline = await pipeline('feature-extraction', 'onnx-community/clip-vit-base-patch32', {
            device: 'wasm',
            progress_callback: (progress) => {
                if (progress.status === 'downloading') {
                    onStatusUpdate(`Téléchargement de l'IA : ${Math.round(progress.loaded / progress.total * 100)}%`);
                }
            }
        });
        
        onStatusUpdate("Chargement de la base de données locale...");
        await loadDatabase();
        
        onStatusUpdate("Prêt ! Ajoutez ou glissez une photo.", false);
    } catch (error) {
        console.error("Détail :", error);
        onStatusUpdate("⚠️ Erreur : Impossible de démarrer l'IA. Vérifiez votre connexion.", false);
    }
}

async function loadDatabase() {
    try {
        const response = await fetch('./jeux_embeddings.json');
        if (!response.ok) throw new Error();
        databaseIndex = await response.json();
    } catch (e) {
        console.warn("Utilisation des données de test.");
        databaseIndex = [
            { nom: "Minecraft", vecteur: new Array(512).fill(0.01) },
            { nom: "GTA V", vecteur: new Array(512).fill(0.05) },
            { nom: "Zelda: Breath of the Wild", vecteur: new Array(512).fill(-0.02) }
        ];
    }
}

function cosineSimilarity(vecA, vecB) {
    let dotProduct = 0.0, normA = 0.0, normB = 0.0;
    for (let i = 0; i < vecA.length; i++) {
        dotProduct += vecA[i] * vecB[i];
        normA += vecA[i] * vecA[i];
        normB += vecB[i] * vecB[i];
    }
    return dotProduct / (Math.sqrt(normA) * Math.sqrt(normB));
}

export async function analyserImage(imageSrc, onStatusUpdate) {
    if (!visionPipeline) return null;
    onStatusUpdate("Analyse des pixels...");
    const output = await visionPipeline(imageSrc);
    const userVector = Array.from(output.data);

    onStatusUpdate("Comparaison avec la base de données...");
    const resultats = databaseIndex.map(jeu => ({
        nom: jeu.nom,
        score: cosineSimilarity(userVector, jeu.vecteur)
    }));

    resultats.sort((a, b) => b.score - a.score);
    return resultats.slice(0, 3);
}
