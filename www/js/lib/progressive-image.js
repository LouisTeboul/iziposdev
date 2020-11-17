// progressive-image.js, v1.2.1
// by Craig Buckler, @craigbuckler
const loadProgressiveImage = function () {

    // start
    var pItem = document.getElementsByClassName('progressive replace');

    for (var i = 0; i < pItem.length; i++) {
        loadFullImage(pItem[i]);
        pItem[i].classList.remove('replace');
    }


    // replace with full image
    function loadFullImage(item) {

        var href = item && (item.getAttribute('data-href') || item.href);
        if (!href) return;

        // load image
        var img = new Image();
        if (item.dataset) {
            img.srcset = item.dataset.srcset || '';
            img.sizes = item.dataset.sizes || '';
        }
        img.src = href;
        //img.className = 'reveal';
        if (img.complete) addImg();
        else
            img.onload = addImg;

        if (img.error)
            selfdestruct();
        else
            img.onerror = selfdestruct;

        function selfdestruct() {
            //item.remove();
            //item.classList.add("hiding")
        }

        // replace image
        function addImg() {

            requestAnimationFrame(function () {

                // disable click
                if (href === item.href) {
                    item.style.cursor = 'default';
                    item.addEventListener('click', function (e) {
                        e.preventDefault();
                    }, false);
                }

                // preview image
                var pImg = item.querySelector && item.querySelector('img.preview');

                if(pImg)
                    pImg.style = 'display:none';

                // add full image
                item.insertBefore(img, pImg && pImg.nextSibling).addEventListener('animationend', function () {
                    // remove preview image
                    if (pImg) {
                        img.alt = pImg.alt || '';
                        item.removeChild(pImg);
                    }

                    img.classList.remove('reveal');

                });
            });
        }
    }
};

// DOM mutation observer
if (MutationObserver) {

    var observer = new MutationObserver(function () {
        loadProgressiveImage();
    });
    observer.observe(document, {subtree: true, childList: true, attributes: false, characterData: false});

}
