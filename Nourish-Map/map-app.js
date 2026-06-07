window.addEventListener('load', () => {

    //coordinate boundaries for Ladywood Birmingham:
    const ladywoodCoords = [-1.9182, 52.4813];
    const webMercatorCoords = ol.proj.fromLonLat(ladywoodCoords);

    //initlising Open Layers map:
    const map = new ol.Map({
        target: 'map',
        layers: [
            new ol.layer.Tile({
                source: new ol.source.OSM()
            })
        ],
        view: new ol.View({
            center: webMercatorCoords,
            zoom: 15
        })
    });
    // setting up pin markers for the collection points
    const markerFeatures = [];
    const collectionLocations = [
        { name: "Ladywood Foodbank", lon: -1.9198, lat: 52.4801},
        { name: "BCG Food Pantry", lon: -1.9262, lat: 52.4851},
        { name: "Incredible Surplus (Ladywood Hub)", lon: -1.9248, lat: 52.4789},
        { name: "Birmingham central Foodbank", lon: -1.9103, lat: 52.4828},
    ];

    const markerStyle = new ol.style.Style({
        image: new ol.style.Circle({
            radius: 9,
            fill: new ol.style.Fill({ color: '#86B070' }),      // Mid Meadow Green center
            stroke: new ol.style.Stroke({ color: '#235F83', width: 2 }) // Dark Slate Blue border
        })
    });

    //looping through each real location & building tracking vector:
    collectionLocations.forEach(loc => {
        const feature = new ol.Feature({
            geometry: new ol.geom.Point(ol.proj.fromLonLat([loc.lon, loc.lat])),
            name: loc.name
        });
        feature.setStyle(markerStyle);
        markerFeatures.push(feature);
    });

    const vectorSource = new ol.source.Vector({ features: markerFeatures });
    const vectorLayer = new ol.layer.Vector({ source: vectorSource });
    map.addLayer(vectorLayer);

    //Map vs list interactive toggle view
    const btnMap = document.getElementById('btn-map');
    const btnList = document.getElementById('btn-list');
    const mapView = document.getElementById('map-view');
    const listView = document.getElementById('list-view');

    // Mobile layout
    if (btnMap && btnList) {
        btnMap.addEventListener('click', () => {
            btnMap.classList.add('active');
            btnList.classList.remove('active');
            mapView.classList.remove('hidden');
            listView.classList.add('hidden');

            setTimeout(() => {
                map.updateSize();
            }, 50);
        });

        btnList.addEventListener('click', () => {
            btnList.classList.add('active');
            btnMap.classList.remove('active');
            listView.classList.remove('hidden');
            mapView.classList.add('hidden');
        });
    }

    // laptop & desktop split-screen view:
  
    const mapTargetElement = document.getElementById('map');
    if (mapTargetElement) {
        const resizeObserver = new ResizeObserver(() => {
            map.updateSize();
        });
        resizeObserver.observe(mapTargetElement);
    }

    //pop up search engine:

    const searchBtn = document.querySelector('.search-btn');

    if (searchBtn) {
        searchBtn.addEventListener('click', () => {
            const userInput = prompt("Enter a location title or resource keyword:", "");
            if (!userInput || !userInput.trim()) return;

            const query = userInput.toLowerCase().trim();

            // 1. Instantly find the first matching location array object
            const matchedLocation = collectionLocations.find(loc => 
                loc.name.toLowerCase().includes(query)
            );

            if (matchedLocation) {
                // finding & highlighting list card when searched
                const cardHeaders = document.querySelectorAll('.food-card h3');
                const targetHeader = Array.from(cardHeaders).find(h => 
                    h.textContent.trim() === matchedLocation.name
                );

                if (targetHeader) {
                    const matchedCard = targetHeader.closest('.food-card');
                    matchedCard.scrollIntoView({ behavior: 'smooth', block: 'nearest' });

                    // a visual flash notification
                    matchedCard.style.backgroundColor = '#f9af8c';
                    setTimeout(() => {
                        matchedCard.style.backgroundColor = matchedCard.classList.contains('urgent') ? 'var(--accent-cream)' : 'var(--bg-white)';
                    }, 1200);
                }
                    // zoom on map to show what was searched
                map.getView().animate({
                    center: ol.proj.fromLonLat([matchedLocation.lon, matchedLocation.lat]),
                    zoom: 16.5,
                    duration: 600
                });

            } else {
                alert(`No locations found matching "${userInput}".`);
            }
        });
    }

});