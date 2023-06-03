// FRONT BACK
let frontBackBtns = document.getElementsByClassName("frontBack");

for(let btn of frontBackBtns){
    const front = btn.parentElement.getElementsByTagName("img")[0];
    const back = btn.parentElement.getElementsByTagName("img")[1]
    btn.addEventListener("click", () => {
        if(back.style.display === "none"){
            front.style.display = "none";
            back.style.display = "block";
        }
        else{
            back.style.display = "none";
            front.style.display = "block";
        }
    });
}

// UP DOWN
let upDownBtns = document.getElementsByClassName("upDown");

for(let btn of upDownBtns){
    const cardImg = btn.parentElement.getElementsByTagName("img")[0];
    let deg = 0;
    btn.addEventListener("click", () => {
        deg += 180;
        cardImg.style.transform = `rotate(${deg}deg)`;
    });
}
