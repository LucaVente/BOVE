// ATTENZIONE: Sostituisci questi valori con la tua configurazione Firebase!
// Vai su Firebase Console > Impostazioni progetto > App Web

// Configurazione Firebase
const firebaseConfig = {
    apiKey: "AIzaSyBpmZIpuZAYuFfLIVi8ZOFt5aOiDdiTpH0",
    authDomain: "bove-app-demo.firebaseapp.com",
    projectId: "bove-app-demo",
    storageBucket: "bove-app-demo.appspot.com",
    messagingSenderId: "123456789012",
    appId: "1:123456789012:web:abcdef1234567890abcdef"
};

// Inizializza Firebase solo se non è già inizializzato
if (!firebase.apps.length) {
    firebase.initializeApp(firebaseConfig);
}

// Referenze ai servizi Firebase
const auth = firebase.auth();
const db = firebase.firestore();
const messaging = firebase.messaging();

// Imposta le impostazioni di persistenza (mantieni login)
auth.setPersistence(firebase.auth.Auth.Persistence.LOCAL)
    .catch((error) => {
        console.error("Errore persistenza auth:", error);
    });

// Funzione per ottenere l'utente corrente
function getCurrentUser() {
    return new Promise((resolve) => {
        const unsubscribe = auth.onAuthStateChanged(user => {
            unsubscribe();
            resolve(user);
        });
    });
}

// Funzione per verificare se l'utente è loggato
function checkAuth() {
    return new Promise(async (resolve, reject) => {
        try {
            const user = await getCurrentUser();
            if (user) {
                resolve(user);
            } else {
                // Se non c'è utente in Firebase, prova con localStorage (modalità demo)
                const demoUser = localStorage.getItem('user');
                if (demoUser) {
                    resolve(JSON.parse(demoUser));
                } else {
                    reject(new Error('Non autenticato'));
                }
            }
        } catch (error) {
            reject(error);
        }
    });
}

// Funzione per gestire errori Firebase
function handleFirebaseError(error) {
    console.error("Firebase Error:", error);
    
    let message = "Si è verificato un errore";
    
    switch (error.code) {
        case 'auth/invalid-email':
            message = "Email non valida";
            break;
        case 'auth/user-disabled':
            message = "Account disabilitato";
            break;
        case 'auth/user-not-found':
            message = "Utente non trovato";
            break;
        case 'auth/wrong-password':
            message = "Password errata";
            break;
        case 'auth/email-already-in-use':
            message = "Email già registrata";
            break;
        case 'auth/weak-password':
            message = "Password troppo debole";
            break;
        case 'auth/network-request-failed':
            message = "Errore di rete. Controlla la connessione";
            break;
        case 'permission-denied':
            message = "Permesso negato";
            break;
        case 'unavailable':
            message = "Servizio non disponibile";
            break;
        default:
            message = error.message || "Errore sconosciuto";
    }
    
    return message;
}

// Export per uso globale (se necessario)
window.firebaseConfig = {
    auth,
    db,
    messaging,
    getCurrentUser,
    checkAuth,
    handleFirebaseError
};