/**
 * Configuração do Firebase — Excellent Loja
 * Mantido em arquivo separado para facilitar troca de projeto/ambiente.
 * Chaves do Firebase Web são públicas por natureza (ficam expostas no bundle do
 * cliente); a segurança real dos dados é garantida pelas regras do Firestore
 * (ver firestore.rules) e pelo Firebase Authentication.
 */
const firebaseConfig = {
  apiKey: "AIzaSyCsCvnzuLAtYTE3QPvjT2gIKryf0K5TReE",
  authDomain: "excellentloja.firebaseapp.com",
  databaseURL: "https://excellentloja-default-rtdb.firebaseio.com",
  projectId: "excellentloja",
  storageBucket: "excellentloja.firebasestorage.app",
  messagingSenderId: "267029530960",
  appId: "1:267029530960:web:832588e1207689b39f4455"
};

firebase.initializeApp(firebaseConfig);

window.auth = firebase.auth();
window.db = firebase.firestore();
window.storage = firebase.storage ? firebase.storage() : null;

// Cache local (IndexedDB) — sem isso, toda vez que o painel abre precisa
// esperar uma ida e volta até o servidor antes de mostrar qualquer dado,
// mesmo o que já tinha sido carregado antes. Com persistência, o Firestore
// mostra na hora o que já tem salvo localmente (de uma visita anterior)
// enquanto busca a versão mais nova em segundo plano — só a primeiríssima
// vez (aparelho/navegador novo) ainda precisa esperar a ida ao servidor.
// synchronizeTabs evita erro quando o painel está aberto em mais de uma aba.
window.db.enablePersistence({ synchronizeTabs: true }).catch(() => {});
