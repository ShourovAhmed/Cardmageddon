//LOGOUT
var openLogoutModal = document.getElementById("open-logout-modal-btn");
var closeLogoutModal = document.getElementById("exit-logout-modal-btn");
var logoutModal = document.getElementById("logout-modal-back");

openLogoutModal.onclick = function() {
  logoutModal.style.display = "flex";
}
closeLogoutModal.onclick = function() {
  logoutModal.style.display = "none";
}