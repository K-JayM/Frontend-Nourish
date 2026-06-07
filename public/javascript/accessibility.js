document.addEventListener("DOMContentLoaded", () => {

    //Font size adjust
    const size = ["xx-small", "x-small", "small", "initial", "x-large", "xx-large"]
    var current_size = 3

    const adjust_small = document.querySelector("#button_small")
    adjust_small.addEventListener("click", () => {
        let font = document.querySelectorAll("*");

        speechSynthesis.cancel()
        reset_background(children)
        if (current_size > 0) {
            current_size -= 1
            for (i of font) {

                i.style.fontSize = size[current_size]

            }
        }
    })

    const adjust_large = document.querySelector("#button_large")
    adjust_large.addEventListener("click", () => {
        let font = document.querySelectorAll("*");

        speechSynthesis.cancel()
        reset_background(children)
        if (current_size < 5) {
            current_size += 1

            for (i of font) {
                i.style.fontSize = size[current_size]

            }
        }
    })


    //TTS
    //1 Select all text elements
    var children = document.body.querySelectorAll("p, a, h1, h2, h3,label, th, button, input")


    //2 add TTS button toggle
    const adjust_TTS = document.querySelector("#button_TTS")
    adjust_TTS.addEventListener("click", () => {
        if (document.querySelector("#accessibility>div").style.display == "block") {
            speechSynthesis.cancel();
            document.querySelector("#accessibility>div").style.display = "none"
        } else {
            document.querySelector("#accessibility>div").style.display = "block"
        }

    })

    //3 Pause button
    const adjust_TTS_pause = document.querySelector("#button_TTS_pause")
    adjust_TTS_pause.addEventListener("click", () => {
        if (speechSynthesis.paused) {
            speechSynthesis.resume();
        } else {
            speechSynthesis.pause();
        }

    })

    //4 Function to read the TTS requests
    var i = 0;
    function speak(children, x) {
        var children = document.body.querySelectorAll("p, a, h1, h2, h3,label, th, button, input")
        speechSynthesis.cancel()
        if (x < 0) {
            x = 0
            i = 0
            var documentText = new SpeechSynthesisUtterance(children[x].textContent);
        } else if (x > children.length - 1) {
            x = children.length - 1
            i = children.length - 1
            return null;

        } else if (children[x].tagName == 'script') {

            i += 1;
            speak(children, i)
        } else if(children[x].tagName == 'button' || children[x].tagName == "input"){
            var documentText = new SpeechSynthesisUtterance(children[x].value);
        }else{
            var documentText = new SpeechSynthesisUtterance(children[x].textContent);
        }


        
        documentText.addEventListener("start", () => {
            children[x].style.backgroundColor = "yellow";
            children[x].style.color = "black";
        });

        documentText.addEventListener("end", () => {

            children[x].style.backgroundColor = "";
            children[x].style.color = "";
            i += 1;
            speak(children, i)
        });

        documentText.addEventListener("start", () => {
            children[x].style.backgroundColor = "yellow";
            children[x].style.color = "black";
        });


         speechSynthesis.speak(documentText);
    }

    //5 reset all css changes during TTS 
    function reset_background(children) {
        for (x = 0; x < children.length; x++) {
            children[x].style.backgroundColor = ""
            children[x].style.color = "";
        }


    }


    //6 play/restart request flow
    const adjust_TTS_play = document.querySelector("#button_TTS_play")
    adjust_TTS_play.addEventListener("click", () => {

        reset_background(children)
        speechSynthesis.cancel()
        children = document.body.querySelectorAll("p, a, h1, h2, h3,label, th, button, input")
        i = 0;
        speak(children, i);

    })


    //7 goes to the next line
    const adjust_TTS_forward = document.querySelector("#button_TTS_forward")
    adjust_TTS_forward.addEventListener("click", () => {

        reset_background(children)
        speechSynthesis.cancel()
        console.log(i)
        i += 1
        speak(children, i)

    })

    //8 goes to the prev line
    const adjust_TTS_backward = document.querySelector("#button_TTS_backward")
    adjust_TTS_backward.addEventListener("click", () => {

        reset_background(children)
        speechSynthesis.cancel()
        i -= 1
        speak(children, i)


    })



})

