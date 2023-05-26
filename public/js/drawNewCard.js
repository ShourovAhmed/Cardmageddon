
// function drawNewCard() {

//     let article=getElementById("previewDraw");
//     let ul=document.createElement(); 

    
//     ul.appendChild(document.createTextNode("Hello?"));
    
//     article.appendChild(li);
// }



// this works but just once and not accessing data

// function drawNewCard() {
//     document.getElementById("addNewCardElement").innerHTML = "ListCardReady[0].image_uris.normal"
    
//   }



function drawNewCard() {
    
    
    let newCard = document.createElement('ul');
    newCard.innerHTML = 'Hello, World!';
   
    
    let table = document.getElementById('previewDraw');
    table.appendChild(newCard);


  }

  