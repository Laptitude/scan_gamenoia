// Importation depuis un autre réseau de distribution plus stable en cas de timeout
import { pipeline, env } from 'https://unpkg.com';

// Forcer l'utilisation des modèles distants hébergés sur les serveurs publics de Hugging Face
env.allowLocalModels = false;
env.remoteObjectURL = 'https://huggingface.co';


// Importation du modèle de vision CLIP depuis un CDN gratuit
import { pipeline, env } from 'https://jsdelivr.net';

// Configuration pour éviter les erreurs de chemins locaux
env.allowLocalModels = false;

let visionPipeline = null;
let databaseIndex = [];

// 1. Initialiser le modèle d'IA au démarrage
export async function initIA(onStatusUpdate) {
    try {
        onStatusUpdate("Chargement du modèle d'IA visuelle (CLIP)...");
        // Téléchargement du modèle de vision pur (très léger et rapide)
        visionPipeline = await pipeline('feature-extraction', 'Xenova/clip-vit-base-patch32');
        
        onStatusUpdate("Chargement de la base de données des jeux...");
        await loadDatabase();
        
        onStatusUpdate("Prêt ! Glissez une capture d'écran pour l'analyser.");
    } catch (error) {
        onStatusUpdate("Erreur d'initialisation : " + error.message);
        console.error(error);
    }
}

// 2. Charger la base de données des signatures de jeux
async function loadDatabase() {
    try {
        // On récupère le fichier JSON contenant tous vos jeux et leurs vecteurs
        const response = await fetch('./jeux_embeddings.json');
        if (!response.ok) throw new Error("Fichier jeux_embeddings.json introuvable.");
        databaseIndex = await response.json();
    } catch (e) {
        // Base de démonstration si le fichier JSON n'existe pas encore
        console.warn("Fichier JSON non trouvé. Utilisation de données de test.");
        databaseIndex = [
            { nom: "Minecraft", vecteur: new Array(512).fill(0.01) },
            { nom: "GTA V", vecteur: new Array(512).fill(0.05) },
            { nom: "Zelda: Breath of the Wild", vecteur: new Array(512).fill(-0.02) }
        ];
    }
}

// 3. Calcul de similarité cosinus (comparaison mathématique de vecteurs)
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

// 4. Analyser la photo de l'utilisateur
export async function analyserImage(imageSrc, onStatusUpdate) {
    if (!visionPipeline) return null;
    
    onStatusUpdate("Analyse des pixels et extraction de la signature...");
    
    // Extraction du vecteur (512 dimensions) de la photo de l'utilisateur
    const output = await visionPipeline(imageSrc);
    const userVector = Array.from(output.data);

    onStatusUpdate("Comparaison instantanée avec des milliers de jeux...");
    
    // Comparer le vecteur de l'utilisateur avec toute la base de données
    const resultats = databaseIndex.map(jeu => {
        const score = cosineSimilarity(userVector, jeu.vecteur);
        return { nom: jeu.nom, score: score };
    });

    // Trier pour obtenir les meilleurs résultats
    resultats.sort((a, b) => b.score - a.score);
    
    return resultats.slice(0, 3); // Retourne le Top 3
}
