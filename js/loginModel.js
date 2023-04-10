var modal = document.getElementById("modal-background");
var onBtn = document.getElementById("open-login-btn");
var offBtn = document.getElementById("exit-login-btn");


onBtn.onclick = function() {
  modal.style.display = "flex";
}
offBtn.onclick = function() {
    modal.style.display = "none";
  }