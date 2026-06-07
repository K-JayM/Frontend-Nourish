const form = document.getElementById("form");
const list = document.getElementById("list");

form.addEventListener("submit", function (event) {
    event.preventDefault();

    const formData = new FormData(form);


    while (list.hasChildNodes()) {
        list.removeChild(list.firstChild);
    }

    fetch('data.json')
        .then((response) => response.json())
        .then((json) => populate(json, formData.get("foodItem"), formData.get("quantitySymbol"), formData.get("quantity"), formData.get("expirySymbol"), formData.get("date")));
});


fetch('data.json')
    .then((response) => response.json())
    .then((json) => populate(json, "", "=", "", "=", ""));


function populate(data, item, quantitySymbol, quantity, dateSymbol, date) {

    if (date != null){
        var filterDateObject = new Date(date);
    }else{
        var filterDateObject = new Date("1970-01-01")
    }

    for (let i = 0; i < data.length; i++){

        var itemDateObject = new Date(data[i].date);

        if ((data[i].item == item) || (item == "")) {
            if (quantitySymbol == "<"){
                if ((parseInt(data[i].quantity) < parseInt(quantity)) || (quantity == "")) {

                    if (dateSymbol == "<") {
                        if ((date == "") || ((itemDateObject.getTime() - filterDateObject.getTime()) < 0)) {
                            createInvLine(data[i].item, data[i].quantity, data[i].date)
                        }

                    } else if (dateSymbol == "=") {
                        if ((date == "") || ((itemDateObject.getTime() - filterDateObject.getTime()) == 0)) {
                            createInvLine(data[i].item, data[i].quantity, data[i].date)
                        }

                    } else if (dateSymbol == ">"){
                        if ((date == "") || ((itemDateObject.getTime() - filterDateObject.getTime()) > 0)) {
                            createInvLine(data[i].item, data[i].quantity, data[i].date)
                        }
                    }
                }

            } else if (quantitySymbol == "="){
                if ((parseInt(data[i].quantity) == parseInt(quantity)) || (quantity == "")) {

                   if (dateSymbol == "<") {
                        if ((date == "") || ((itemDateObject.getTime() - filterDateObject.getTime()) < 0)) {
                            createInvLine(data[i].item, data[i].quantity, data[i].date)
                        }

                   } else if (dateSymbol == "=") {
                        if ((date == "") || ((itemDateObject.getTime() - filterDateObject.getTime()) == 0)) {
                            createInvLine(data[i].item, data[i].quantity, data[i].date)
                        }

                   } else if (dateSymbol == ">"){
                        if ((date == "") || ((itemDateObject.getTime() - filterDateObject.getTime()) > 0)) {
                            createInvLine(data[i].item, data[i].quantity, data[i].date)
                        }
                   }
                }

            } else if (quantitySymbol = ">"){
                if ((parseInt(data[i].quantity) > parseInt(quantity)) || (quantity == "")) {
                    if (dateSymbol == "<") {
                        if ((date == "") || ((itemDateObject.getTime() - filterDateObject.getTime()) < 0)) {
                            createInvLine(data[i].item, data[i].quantity, data[i].date)
                        }

                    } else if (dateSymbol == "=") {
                        if ((date == "") || ((itemDateObject.getTime() - filterDateObject.getTime()) == 0)) {
                            createInvLine(data[i].item, data[i].quantity, data[i].date)
                        }

                    } else if (dateSymbol == ">"){
                        if ((date == "") || ((itemDateObject.getTime() - filterDateObject.getTime()) > 0)) {
                            createInvLine(data[i].item, data[i].quantity, data[i].date)
                        }
                    }
                }
            }
        }
    }
}

function createInvLine(item, quantity, date){

    var listElement = document.createElement("li");
    listElement.classList.add('invLine');
    list.appendChild(listElement);

    var para1 = document.createElement("p");
    var para2 = document.createElement("p");
    var para3 = document.createElement("p");
    var para4 = document.createElement("p");

    para1.innerText = item;
    para2.innerText = quantity;
    para3.innerText = date;

    var button = document.createElement("button");
    button.innerText = "delete";
    para4.appendChild(button);

    listElement.appendChild(para1);
    listElement.appendChild(para2);
    listElement.appendChild(para3);
    listElement.appendChild(para4);
}