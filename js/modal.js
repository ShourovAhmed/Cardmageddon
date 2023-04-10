//LOGIN
var loginOnBtn = document.getElementById("open-login-modal-btn");
var loginOffBtn = document.getElementById("exit-login-modal-btn");
var loginModal = document.getElementById("login-modal-back");

loginOnBtn.onclick = function() {
  loginModal.style.display = "flex";
}
loginOffBtn.onclick = function() {
  loginModal.style.display = "none";
}


//LOGOUT
var logoutOnBtn = document.getElementById("open-logout-modal-btn");
var logoutOffBtn = document.getElementById("exit-logout-modal-btn");
var logoutModal = document.getElementById("logout-modal-back");

logoutOnBtn.onclick = function() {
    logoutModal.style.display = "flex";
}
logoutOffBtn.onclick = function() {
    logoutModal.style.display = "none";
  }