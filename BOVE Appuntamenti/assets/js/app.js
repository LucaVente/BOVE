// App principale BOVE s.n.c.
class BOVEApp {
    constructor() {
        this.currentUser = null;
        this.appointments = [];
        this.clients = [];
        this.init();
    }

    async init() {
        console.log("🚀 BOVE App inizializzata");
        
        // Verifica se siamo in modalità PWA
        this.checkPWA();
        
        // Registra Service Worker
        await this.registerServiceWorker();
        
        // Controlla autenticazione
        await this.checkAuthentication();
        
        // Inizializza UI
        this.initUI();
        
        // Carica dati se autenticato
        if (this.currentUser) {
            await this.loadInitialData();
        }
        
        // Setup notifiche
        this.setupNotifications();
    }

    // Controlla se l'app è installata come PWA
    checkPWA() {
        const isPWA = window.matchMedia('(display-mode: standalone)').matches || 
                     window.navigator.standalone ||
                     document.referrer.includes('android-app://');
        
        if (isPWA) {
            document.body.classList.add('pwa-mode');
            console.log("📱 App in esecuzione come PWA");
        }
        
        return isPWA;
    }

    // Registra Service Worker
    async registerServiceWorker() {
        if ('serviceWorker' in navigator) {
            try {
                const registration = await navigator.serviceWorker.register('/service-worker.js');
                console.log('✅ Service Worker registrato:', registration.scope);
                
                // Salva riferimento per notifiche
                window.swRegistration = registration;
                
            } catch (error) {
                console.error('❌ Errore registrazione Service Worker:', error);
            }
        }
    }

    // Controlla autenticazione
    async checkAuthentication() {
        try {
            // Prova Firebase prima
            if (typeof firebase !== 'undefined' && firebase.auth) {
                const user = await new Promise((resolve) => {
                    const unsubscribe = firebase.auth().onAuthStateChanged(user => {
                        unsubscribe();
                        resolve(user);
                    });
                });
                
                if (user) {
                    this.currentUser = user;
                    localStorage.setItem('user', JSON.stringify({
                        uid: user.uid,
                        email: user.email,
                        displayName: user.displayName
                    }));
                    return;
                }
            }
            
            // Fallback a localStorage per modalità demo
            const savedUser = localStorage.getItem('user');
            if (savedUser) {
                this.currentUser = JSON.parse(savedUser);
                console.log("👤 Utente demo caricato:", this.currentUser.email);
            }
            
        } catch (error) {
            console.log("Modalità demo attiva:", error.message);
        }
    }

    // Inizializza UI
    initUI() {
        // Setup toggle password
        this.setupPasswordToggle();
        
        // Setup dark mode
        this.setupDarkMode();
        
        // Setup bottom navigation
        this.setupNavigation();
        
        // Setup gesture per tornare indietro
        this.setupBackGesture();
    }

    // Setup toggle password visibility
    setupPasswordToggle() {
        document.querySelectorAll('[data-toggle-password]').forEach(button => {
            button.addEventListener('click', function() {
                const input = this.previousElementSibling;
                const icon = this.querySelector('span');
                
                if (input.type === 'password') {
                    input.type = 'text';
                    icon.textContent = 'visibility_off';
                } else {
                    input.type = 'password';
                    icon.textContent = 'visibility';
                }
            });
        });
    }

    // Setup dark mode
    setupDarkMode() {
        const darkModePreference = localStorage.getItem('darkMode');
        const systemPrefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
        
        if (darkModePreference === 'true' || (!darkModePreference && systemPrefersDark)) {
            document.documentElement.classList.add('dark');
        }
        
        // Toggle dark mode
        document.querySelectorAll('[data-toggle-dark]').forEach(toggle => {
            toggle.addEventListener('click', () => {
                document.documentElement.classList.toggle('dark');
                localStorage.setItem('darkMode', document.documentElement.classList.contains('dark'));
            });
        });
    }

    // Setup navigation
    setupNavigation() {
        // Gestione link attivi
        const currentPage = window.location.pathname.split('/').pop() || 'index.html';
        document.querySelectorAll('.nav-link').forEach(link => {
            const href = link.getAttribute('href');
            if (href === currentPage || 
                (currentPage === '' && href === 'index.html') ||
                (currentPage.includes(href.replace('.html', '')))) {
                link.classList.add('active');
                link.querySelector('.material-symbols-outlined')?.classList.add('filled');
            }
        });
        
        // Navigazione programmatica
        document.querySelectorAll('[data-navigate]').forEach(button => {
            button.addEventListener('click', (e) => {
                e.preventDefault();
                const page = button.getAttribute('data-navigate');
                this.navigateTo(page);
            });
        });
    }

    // Naviga a una pagina
    navigateTo(page) {
        // Aggiungi effetto transizione
        document.body.style.opacity = '0.8';
        document.body.style.transition = 'opacity 0.2s';
        
        setTimeout(() => {
            window.location.href = page;
        }, 200);
    }

    // Setup gesto per tornare indietro (swipe da bordo sinistro)
    setupBackGesture() {
        let startX = 0;
        let startY = 0;
        
        document.addEventListener('touchstart', (e) => {
            startX = e.touches[0].clientX;
            startY = e.touches[0].clientY;
        });
        
        document.addEventListener('touchend', (e) => {
            const endX = e.changedTouches[0].clientX;
            const endY = e.changedTouches[0].clientY;
            
            // Swipe da bordo sinistro (meno di 50px dall'inizio)
            if (startX < 50 && endX > startX + 100 && Math.abs(endY - startY) < 50) {
                if (window.history.length > 1) {
                    window.history.back();
                }
            }
        });
    }

    // Setup notifiche
    async setupNotifications() {
        if ('Notification' in window && 'serviceWorker' in navigator) {
            try {
                const permission = await Notification.requestPermission();
                
                if (permission === 'granted') {
                    console.log('✅ Notifiche abilitate');
                    
                    // Richiedi token FCM per Firebase Cloud Messaging
                    if (typeof firebase !== 'undefined' && firebase.messaging) {
                        try {
                            const token = await firebase.messaging().getToken({
                                vapidKey: 'TUO_VAPID_KEY' // Da configurare in Firebase
                            });
                            
                            if (token) {
                                localStorage.setItem('fcmToken', token);
                                console.log('📱 Token FCM:', token);
                            }
                        } catch (error) {
                            console.log('Notifiche push non disponibili:', error);
                        }
                    }
                }
            } catch (error) {
                console.error('Errore richiesta notifiche:', error);
            }
        }
    }

    // Carica dati iniziali
    async loadInitialData() {
        try {
            // Carica appuntamenti
            await this.loadAppointments();
            
            // Carica clienti
            await this.loadClients();
            
            // Aggiorna UI
            this.updateDashboard();
            
        } catch (error) {
            console.error('Errore caricamento dati:', error);
            this.showDemoData();
        }
    }

    // Carica appuntamenti
    async loadAppointments() {
        if (!this.currentUser) return;
        
        try {
            if (typeof firebase !== 'undefined' && firebase.firestore) {
                // Modalità Firebase
                const snapshot = await firebase.firestore()
                    .collection('appointments')
                    .where('userId', '==', this.currentUser.uid)
                    .orderBy('date', 'asc')
                    .limit(50)
                    .get();
                
                this.appointments = snapshot.docs.map(doc => ({
                    id: doc.id,
                    ...doc.data()
                }));
            } else {
                // Modalità demo
                this.appointments = this.getDemoAppointments();
            }
            
            localStorage.setItem('appointments', JSON.stringify(this.appointments));
            this.dispatchEvent('appointments:updated', this.appointments);
            
        } catch (error) {
            console.error('Errore caricamento appuntamenti:', error);
            throw error;
        }
    }

    // Carica clienti
    async loadClients() {
        if (!this.currentUser) return;
        
        try {
            if (typeof firebase !== 'undefined' && firebase.firestore) {
                // Modalità Firebase
                const snapshot = await firebase.firestore()
                    .collection('clients')
                    .where('userId', '==', this.currentUser.uid)
                    .orderBy('name', 'asc')
                    .limit(50)
                    .get();
                
                this.clients = snapshot.docs.map(doc => ({
                    id: doc.id,
                    ...doc.data()
                }));
            } else {
                // Modalità demo
                this.clients = this.getDemoClients();
            }
            
            localStorage.setItem('clients', JSON.stringify(this.clients));
            this.dispatchEvent('clients:updated', this.clients);
            
        } catch (error) {
            console.error('Errore caricamento clienti:', error);
            throw error;
        }
    }

    // Mostra dati demo
    showDemoData() {
        console.log("📱 Caricamento dati demo...");
        
        this.appointments = this.getDemoAppointments();
        this.clients = this.getDemoClients();
        
        localStorage.setItem('appointments', JSON.stringify(this.appointments));
        localStorage.setItem('clients', JSON.stringify(this.clients));
        
        this.dispatchEvent('appointments:updated', this.appointments);
        this.dispatchEvent('clients:updated', this.clients);
    }

    // Genera appuntamenti demo
    getDemoAppointments() {
        const today = new Date();
        const tomorrow = new Date(today);
        tomorrow.setDate(tomorrow.getDate() + 1);
        
        return [
            {
                id: '1',
                title: 'Installazione Impianto Elettrico',
                client: 'Rossi Mario',
                address: 'Via Roma 10, Milano',
                date: today.toISOString(),
                startTime: '08:30',
                endTime: '10:30',
                status: 'completed',
                type: 'installation',
                assignedTo: 'MR'
            },
            {
                id: '2',
                title: 'Sistema Allarme & CCTV',
                client: 'Bianchi Elettronica S.r.l.',
                address: 'Corso Italia 5, Milano',
                date: today.toISOString(),
                startTime: '11:00',
                endTime: '13:30',
                status: 'in_progress',
                type: 'security',
                assignedTo: 'Squadra'
            },
            {
                id: '3',
                title: 'Manutenzione Ordinaria',
                client: 'Verdi Giulia',
                address: 'Piazza Duomo 1, Milano',
                date: today.toISOString(),
                startTime: '15:00',
                endTime: '16:00',
                status: 'todo',
                type: 'maintenance',
                assignedTo: 'MR'
            }
        ];
    }

    // Genera clienti demo
    getDemoClients() {
        return [
            {
                id: '1',
                name: 'Rossi Mario',
                email: 'rossi.mario@email.it',
                phone: '+39 345 678 9012',
                address: 'Via Roma 10, Milano',
                type: 'individual',
                lastVisit: '2024-01-12',
                notes: 'Cliente fisso, paga puntualmente'
            },
            {
                id: '2',
                name: 'Bianchi Elettronica S.r.l.',
                email: 'info@bianchielettronica.it',
                phone: '+39 02 1234567',
                address: 'Corso Italia 45, Monza',
                type: 'company',
                lastVisit: '2024-01-10',
                notes: 'Azienda, richiede fattura elettronica'
            },
            {
                id: '3',
                name: 'Verdi Giulia',
                email: 'giulia.verdi@email.it',
                phone: '+39 333 456 7890',
                address: 'Piazza Duomo 1, Milano',
                type: 'individual',
                lastVisit: '2024-01-08',
                notes: 'Nuovo cliente, interessata a domotica'
            }
        ];
    }

    // Aggiorna dashboard
    updateDashboard() {
        // Conta appuntamenti per oggi
        const today = new Date().toDateString();
        const todaysAppointments = this.appointments.filter(apt => {
            const aptDate = new Date(apt.date).toDateString();
            return aptDate === today;
        });
        
        // Calcola progresso
        const completed = todaysAppointments.filter(apt => apt.status === 'completed').length;
        const total = todaysAppointments.length;
        const progress = total > 0 ? (completed / total) * 100 : 0;
        
        // Emetti eventi per aggiornare UI
        this.dispatchEvent('dashboard:update', {
            progress,
            completed,
            total,
            todaysAppointments
        });
    }

    // Gestione login
    async login(email, password) {
        try {
            // Modalità Firebase
            if (typeof firebase !== 'undefined' && firebase.auth) {
                const userCredential = await firebase.auth().signInWithEmailAndPassword(email, password);
                this.currentUser = userCredential.user;
                
                localStorage.setItem('user', JSON.stringify({
                    uid: this.currentUser.uid,
                    email: this.currentUser.email,
                    displayName: this.currentUser.displayName
                }));
                
                return this.currentUser;
            } else {
                // Modalità demo
                throw new Error('Firebase non disponibile, modalità demo attiva');
            }
            
        } catch (error) {
            console.error('Login error:', error);
            
            // Fallback a modalità demo
            this.currentUser = {
                uid: 'demo-' + Date.now(),
                email: email,
                displayName: 'Demo User'
            };
            
            localStorage.setItem('user', JSON.stringify(this.currentUser));
            return this.currentUser;
        }
    }

    // Logout
    async logout() {
        try {
            if (typeof firebase !== 'undefined' && firebase.auth) {
                await firebase.auth().signOut();
            }
        } catch (error) {
            console.error('Logout error:', error);
        }
        
        // Pulisci dati locali
        localStorage.removeItem('user');
        localStorage.removeItem('appointments');
        localStorage.removeItem('clients');
        
        this.currentUser = null;
        this.appointments = [];
        this.clients = [];
        
        // Reindirizza al login
        window.location.href = 'index.html';
    }

    // Invia notifica
    sendNotification(title, options = {}) {
        if ('Notification' in window && Notification.permission === 'granted') {
            const notification = new Notification(title, {
                icon: '/assets/icons/icon-192.png',
                badge: '/assets/icons/icon-96.png',
                ...options
            });
            
            notification.onclick = () => {
                window.focus();
                notification.close();
            };
            
            return notification;
        } else if ('serviceWorker' in navigator && window.swRegistration) {
            // Invia notifica tramite Service Worker
            window.swRegistration.showNotification(title, {
                icon: '/assets/icons/icon-192.png',
                badge: '/assets/icons/icon-96.png',
                ...options
            });
        }
    }

    // Salva appuntamento
    async saveAppointment(appointment) {
        if (!this.currentUser) {
            throw new Error('Utente non autenticato');
        }
        
        try {
            let savedAppointment;
            
            if (typeof firebase !== 'undefined' && firebase.firestore) {
                // Modalità Firebase
                const appointmentWithUser = {
                    ...appointment,
                    userId: this.currentUser.uid,
                    createdAt: firebase.firestore.FieldValue.serverTimestamp(),
                    updatedAt: firebase.firestore.FieldValue.serverTimestamp()
                };
                
                if (appointment.id) {
                    // Aggiorna esistente
                    await firebase.firestore()
                        .collection('appointments')
                        .doc(appointment.id)
                        .update(appointmentWithUser);
                    
                    savedAppointment = { ...appointmentWithUser, id: appointment.id };
                } else {
                    // Crea nuovo
                    const docRef = await firebase.firestore()
                        .collection('appointments')
                        .add(appointmentWithUser);
                    
                    savedAppointment = { ...appointmentWithUser, id: docRef.id };
                }
            } else {
                // Modalità demo
                if (appointment.id) {
                    // Aggiorna esistente
                    const index = this.appointments.findIndex(a => a.id === appointment.id);
                    if (index !== -1) {
                        this.appointments[index] = {
                            ...this.appointments[index],
                            ...appointment,
                            updatedAt: new Date().toISOString()
                        };
                        savedAppointment = this.appointments[index];
                    }
                } else {
                    // Crea nuovo
                    savedAppointment = {
                        ...appointment,
                        id: 'demo-' + Date.now(),
                        userId: this.currentUser.uid,
                        createdAt: new Date().toISOString(),
                        updatedAt: new Date().toISOString()
                    };
                    this.appointments.push(savedAppointment);
                }
                
                localStorage.setItem('appointments', JSON.stringify(this.appointments));
            }
            
            // Notifica aggiornamento
            this.dispatchEvent('appointment:saved', savedAppointment);
            
            // Invia notifica se è per oggi
            const today = new Date().toDateString();
            const aptDate = new Date(appointment.date).toDateString();
            
            if (aptDate === today) {
                this.sendNotification('Appuntamento aggiornato', {
                    body: `${appointment.title} - ${appointment.startTime}`,
                    tag: 'appointment-update'
                });
            }
            
            return savedAppointment;
            
        } catch (error) {
            console.error('Errore salvataggio appuntamento:', error);
            throw error;
        }
    }

    // Elimina appuntamento
    async deleteAppointment(appointmentId) {
        try {
            if (typeof firebase !== 'undefined' && firebase.firestore) {
                await firebase.firestore()
                    .collection('appointments')
                    .doc(appointmentId)
                    .delete();
            } else {
                // Modalità demo
                this.appointments = this.appointments.filter(apt => apt.id !== appointmentId);
                localStorage.setItem('appointments', JSON.stringify(this.appointments));
            }
            
            this.dispatchEvent('appointment:deleted', appointmentId);
            
        } catch (error) {
            console.error('Errore eliminazione appuntamento:', error);
            throw error;
        }
    }

    // Sistema eventi
    dispatchEvent(eventName, data) {
        const event = new CustomEvent(eventName, { detail: data });
        window.dispatchEvent(event);
    }

    on(eventName, callback) {
        window.addEventListener(eventName, (e) => callback(e.detail));
    }

    off(eventName, callback) {
        window.removeEventListener(eventName, (e) => callback(e.detail));
    }
}

// Inizializza app quando il DOM è pronto
document.addEventListener('DOMContentLoaded', () => {
    window.boveApp = new BOVEApp();
});

// Esponi funzioni globali
window.login = async function(email, password) {
    return window.boveApp?.login(email, password);
};

window.logout = async function() {
    return window.boveApp?.logout();
};

window.saveAppointment = async function(appointment) {
    return window.boveApp?.saveAppointment(appointment);
};

window.sendNotification = function(title, options) {
    return window.boveApp?.sendNotification(title, options);
};