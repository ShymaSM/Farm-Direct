const firebaseConfig = {
  apiKey: "AIzaSyDBx0TP6htAnjXshjwycxiWylGg55WpTFg",
  authDomain: "farmdirect-2ed94.firebaseapp.com",
  projectId: "farmdirect-2ed94",
  storageBucket: "farmdirect-2ed94.firebasestorage.app",
  messagingSenderId: "160162755746",
  appId: "1:160162755746:web:3cc7b680756908ceaf13fb",
  measurementId: "G-1TFM7MKY9E"
};

// Initialize Firebase only once
if (!firebase.apps.length) {
  firebase.initializeApp(firebaseConfig);
}
const auth = firebase.auth();
const db = firebase.firestore();
