// FIREBASE CONFIG
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
import { getFirestore, collection, addDoc, getDocs, deleteDoc, doc } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

const firebaseConfig = {
  apiKey: "AIzaSyDdzCiachuhbE9jATz-TesPI2vUVIJrHjM",
  authDomain: "sistemadegestion-7400d.firebaseapp.com",
  projectId: "sistemadegestion-7400d",
  storageBucket: "sistemadegestion-7400d.appspot.com",
  messagingSenderId: "709030283072",
  appId: "1:709030283072:web:5997837b36a448e9515ca5"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

// CLOUDINARY UPLOAD
async function subirDocumentoCloudinary(file) {
  const url = "https://api.cloudinary.com/v1_1/df79cjklp/upload";
  const formData = new FormData();
  formData.append("file", file);
  formData.append("upload_preset", "fci_documentos");

  const response = await fetch(url, {
    method: "POST",
    body: formData
  });

  const data = await response.json();
  return data.secure_url;
}

// UI Elements
const loginScreen = document.getElementById("loginScreen");
const dashboard = document.getElementById("dashboard");
const btnLogin = document.getElementById("btnLogin");
const btnCrearAdmin = document.getElementById("btnCrearAdmin");
const loginMsg = document.getElementById("loginMsg");
const userLogged = document.getElementById("userLogged");
const btnLogout = document.getElementById("btnLogout");

const tabs = document.querySelectorAll(".tabBtn");
const tabContents = document.querySelectorAll(".tabContent");

const usersList = document.getElementById("usersList");
const deptList = document.getElementById("deptList");
const gerList = document.getElementById("gerList");
const solList = document.getElementById("solList");
const historialList = document.getElementById("historialList");

const statTotal = document.getElementById("statTotal");
const statPendientes = document.getElementById("statPendientes");
const statReunion = document.getElementById("statReunion");
const statFinalizadas = document.getElementById("statFinalizadas");

// LOGIN FIXED (sin auth)
let currentUser = null;

const hardcodedAdmin = { user: "Admin", pass: "1130" };

btnLogin.onclick = () => {
  const u = document.getElementById("loginUser").value;
  const p = document.getElementById("loginPass").value;

  // Login admin fijo
  if (u === hardcodedAdmin.user && p === hardcodedAdmin.pass) {
    currentUser = { name: "Admin", role: "admin" };
    showDashboard();
    return;
  }

  // Login con usuarios creados
  loginWithFirebaseUser(u, p);
};

btnCrearAdmin.onclick = async () => {
  await addDoc(collection(db, "Usuarios"), {
    usuario: "Admin",
    pass: "1130",
    email: "admin@fcipty.com",
    role: "admin",
    permisos: {
      perm1: true,
      perm2: true,
      perm3: true,
      perm4: true,
      perm5: true
    }
  });
  loginMsg.innerText = "Admin creado en Firebase.";
};

btnLogout.onclick = () => {
  currentUser = null;
  dashboard.classList.add("hide");
  loginScreen.classList.remove("hide");
};

// TAB SWITCH
tabs.forEach(tab => {
  tab.onclick = () => {
    tabs.forEach(t => t.classList.remove("active"));
    tab.classList.add("active");

    tabContents.forEach(c => c.classList.remove("active"));
    document.getElementById(tab.dataset.tab).classList.add("active");
  };
});

// LOGIN FIREBASE
async function loginWithFirebaseUser(u, p) {
  const snapshot = await getDocs(collection(db, "Usuarios"));
  let found = false;

  snapshot.forEach(doc => {
    const data = doc.data();
    if (data.usuario === u && data.pass === p) {
      found = true;
      currentUser = { name: data.usuario, role: data.role, permisos: data.permisos };
    }
  });

  if (!found) {
    loginMsg.innerText = "Usuario o contraseña incorrectos.";
    return;
  }

  showDashboard();
}

// SHOW DASHBOARD
function showDashboard() {
  loginScreen.classList.add("hide");
  dashboard.classList.remove("hide");
  userLogged.innerText = `Conectado como: ${currentUser.name} (${currentUser.role})`;

  loadAll();
}

// LOAD ALL DATA
async function loadAll() {
  await loadUsers();
  await loadDepartamentos();
  await loadGerencias();
  await loadSolicitudes();
  await loadDashboardStats();
}

// USERS
document.getElementById("btnAddUser").onclick = async () => {
  const usuario = document.getElementById("userName").value;
  const email = document.getElementById("userEmail").value;
  const pass = document.getElementById("userPass").value;
  const role = document.getElementById("userRole").value;
  const dept = document.getElementById("userDept").value;
  const ger = document.getElementById("userGer").value;

  const permisos = {
    perm1: document.getElementById("perm1").checked,
    perm2: document.getElementById("perm2").checked,
    perm3: document.getElementById("perm3").checked,
    perm4: document.getElementById("perm4").checked,
    perm5: document.getElementById("perm5").checked
  };

  await addDoc(collection(db, "Usuarios"), { usuario, email, pass, role, dept, ger, permisos });
  await loadUsers();
};

async function loadUsers() {
  usersList.innerHTML = "";
  const snapshot = await getDocs(collection(db, "Usuarios"));
  snapshot.forEach(docu => {
    const data = docu.data();
    usersList.innerHTML += `
      <div class="item">
        <b>${data.usuario}</b> (${data.role}) - ${data.email}
        <button class="delete" onclick="deleteUser('${docu.id}')">Eliminar</button>
      </div>
    `;
  });
}

window.deleteUser = async (id) => {
  await deleteDoc(doc(db, "Usuarios", id));
  await loadUsers();
};

// DEPARTAMENTOS
document.getElementById("btnAddDept").onclick = async () => {
  const name = document.getElementById("deptName").value;
  await addDoc(collection(db, "Departamentos"), { nombre: name });
  await loadDepartamentos();
};

async function loadDepartamentos() {
  deptList.innerHTML = "";
  const snapshot = await getDocs(collection(db, "Departamentos"));

  document.getElementById("userDept").innerHTML = "";
  document.getElementById("solDept").innerHTML = "";

  snapshot.forEach(docu => {
    const data = docu.data();
    deptList.innerHTML += `<div class="item">${data.nombre}</div>`;
    document.getElementById("userDept").innerHTML += `<option value="${data.nombre}">${data.nombre}</option>`;
    document.getElementById("solDept").innerHTML += `<option value="${data.nombre}">${data.nombre}</option>`;
  });
}

// GERENCIAS
document.getElementById("btnAddGer").onclick = async () => {
  const name = document.getElementById("gerName").value;
  await addDoc(collection(db, "Gerencias"), { nombre: name });
  await loadGerencias();
};

async function loadGerencias() {
  gerList.innerHTML = "";
  const snapshot = await getDocs(collection(db, "Gerencias"));

  document.getElementById("userGer").innerHTML = "";
  document.getElementById("solGer").innerHTML = "";

  snapshot.forEach(docu => {
    const data = docu.data();
    gerList.innerHTML += `<div class="item">${data.nombre}</div>`;
    document.getElementById("userGer").innerHTML += `<option value="${data.nombre}">${data.nombre}</option>`;
    document.getElementById("solGer").innerHTML += `<option value="${data.nombre}">${data.nombre}</option>`;
  });
}

// SOLICITUDES
document.getElementById("btnAddSol").onclick = async () => {
  const title = document.getElementById("solTitle").value;
  const desc = document.getElementById("solDesc").value;
  const dept = document.getElementById("solDept").value;
  const ger = document.getElementById("solGer").value;
  const file = document.getElementById("solFile").files[0];

  let fileUrl = "";
  if (file) fileUrl = await subirDocumentoCloudinary(file);

  await addDoc(collection(db, "Solicitudes"), {
    title,
    desc,
    dept,
    ger,
    fileUrl,
    estado: "Pendiente",
    historial: [{ estado: "Pendiente", fecha: new Date().toISOString(), comentario: "Creado" }],
    createdBy: currentUser.name
  });

  await loadSolicitudes();
  await loadDashboardStats();
};

async function loadSolicitudes() {
  solList.innerHTML = "";
  historialList.innerHTML = "";

  const snapshot = await getDocs(collection(db, "Solicitudes"));

  snapshot.forEach(docu => {
    const data = docu.data();

    solList.innerHTML += `
      <div class="item">
        <b>${data.title}</b> - Estado: ${data.estado}
        <button class="details" onclick="verSolicitud('${docu.id}')">Detalles</button>
        <button class="delete" onclick="deleteSolicitud('${docu.id}')">Eliminar</button>
      </div>
    `;

    historialList.innerHTML += `
      <div class="item">
        <b>${data.title}</b> - ${data.estado} - Creado por ${data.createdBy}
      </div>
    `;
  });
}

window.deleteSolicitud = async (id) => {
  await deleteDoc(doc(db, "Solicitudes", id));
  await loadSolicitudes();
  await loadDashboardStats();
};

window.verSolicitud = async (id) => {
  const docu = await getDocs(collection(db, "Solicitudes"));
  docu.forEach(async (d) => {
    if (d.id === id) {
      const data = d.data();
      alert(`Solicitud: ${data.title}\nDescripción: ${data.desc}\nEstado: ${data.estado}\nArchivo: ${data.fileUrl}`);
    }
  });
};

// DASHBOARD STATS
async function loadDashboardStats() {
  const snapshot = await getDocs(collection(db, "Solicitudes"));
  let total = 0, pend = 0, reu = 0, fin = 0;

  snapshot.forEach(docu => {
    const data = docu.data();
    total++;

    if (data.estado === "Pendiente") pend++;
    if (data.estado === "Solicitud de reunión") reu++;
    if (data.estado === "Finalizado") fin++;
  });

  statTotal.innerText = total;
  statPendientes.innerText = pend;
  statReunion.innerText = reu;
  statFinalizadas.innerText = fin;
}