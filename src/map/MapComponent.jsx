import React from "react";
import { useState, useEffect, useRef } from "react";
import { MapContainer, TileLayer, useMapEvents, GeoJSON, Marker, Popup, useMap } from "react-leaflet";
import L from "leaflet";

import "leaflet/dist/leaflet.css";
import Tuna from '/src/assets/Yellowfin Tuna.jpg'
import clownfish from '/src/assets/Clarks clownfish.jpg'
import sardine from '/src/assets/Indian oil sardine.jpg'
import anchovy from '/src/assets/Indian anchovy.jpg'
import mackerel from '/src/assets/mackerel.jpg'
import firefly from '/src/assets/Sea firefly (bioluminescent ostracod).jpg'
import crab from '/src/assets/Swimming crab.jpg';
import ostracod from '/src/assets/Ostracod (seed shrimp).jpg';
import mossy from '/src/assets/Mossy red seaweed.jpg';
import lettuce from '/src/assets/Sea lettuce.jpg';
import * as turf from '@turf/turf';
import dinoflagellate from '/src/assets/Dinoflagellate (phytoplankton).jpg';
import sparkle from '/src/assets/Sea sparkle (bioluminescent dinoflagellate).jpg';
function BoundsUpdater() {
    const map = useMap();

    useEffect(() => {
        const worldBounds = L.latLngBounds([-90, -180], [90, 180]);
        map.setMaxBounds(worldBounds);
    }, [map]);

    return null;
}


function QueryResultsLayer({ geoJsonData, pinnedGeoJsonData, colors }) {
  if (
    (!geoJsonData || Object.keys(geoJsonData).length === 0) &&
    (!pinnedGeoJsonData || Object.keys(pinnedGeoJsonData).length === 0)
  ) {
    return null;
  }

  // Combine both GeoJSON datasets
  const allGeoJsonData = { ...geoJsonData, ...pinnedGeoJsonData };

  return (
    <>
      {Object.entries(allGeoJsonData).map(([filename, geojson], index) => {
        const color = colors[index % colors.length];

        return (
          <GeoJSON
            key={`${filename}-${index}`}
            data={geojson}
            style={() => ({
              radius: 12,
              color: color,
              weight: 4,
              opacity: 0.8,
              fillOpacity: 0.6,
              lineJoin: "round",
            })}
            pointToLayer={(feature, latlng) => {
              return L.circleMarker(latlng, {
                radius: 12,
                fillColor: color,
                color: color,
                weight: 4,
                opacity: 1,
                fillOpacity: 0.8,
                lineJoin: "round",
              });
            }}
            onEachFeature={(feature, layer) => {
              let popupContent = `<strong>Dataset:</strong> ${filename}<br>`;
              if (feature.properties) {
                Object.keys(feature.properties).forEach(key => {
                  popupContent += `<strong>${key}:</strong> ${feature.properties[key]}<br>`;
                });
              }
              layer.bindPopup(popupContent);
            }}
          />
        );
      })}
    </>
  );
}
function DropHandler({ onDropMarker }) {
    const map = useMap();

    useEffect(() => {
        const container = map.getContainer();

        const handleDrop = (e) => {
            e.preventDefault();
            const bounds = container.getBoundingClientRect();
            const x = e.clientX - bounds.left;
            const y = e.clientY - bounds.top;

            const latlng = map.containerPointToLatLng([x, y]);
            onDropMarker(latlng); // just call once
        };

        const handleDragOver = (e) => e.preventDefault();

        container.addEventListener("dragover", handleDragOver);
        container.addEventListener("drop", handleDrop);

        // ✅ remove listeners when component unmounts or rerenders
        return () => {
            container.removeEventListener("dragover", handleDragOver);
            container.removeEventListener("drop", handleDrop);
        };
    }, [map, onDropMarker]);

    return null;
}


export default function MapComponet() {
    const [openlist, setopenlist] = useState(null);
    const [query, setQuery] = useState("");
    const [loading, setLoading] = useState(false);
    const [geoJsonData, setGeoJsonData] = useState({});
    const [droppedMarkers, setDroppedMarkers] = useState([]);
    const [pop, setpop] = useState([]);
    const [fishPos, setFishPos] = useState(null);
    const [pinned, setpinned] = useState([]);
    const [pinnedGeoJsonData, setPinnedGeoJsonData] = useState({});

    const fishIcon = new L.DivIcon({
        html: "🦈",          // the emoji itself
        className: "fish-icon", // optional custom class
        iconSize: [30, 30],  // size box for the emoji
        iconAnchor: [15, 15] // center the emoji on the drop point
    });

    const [status, setStatus] = useState("");
    const images = {
        "Yellowfin Tuna": Tuna,
        "Clark's Clownfish": clownfish,
        "Sea firefly (bioluminescent ostracod)": firefly,
        "Indian Oil Sardine": sardine,
        "Indian Anchovey": anchovy,
        "Indian Mackerel": mackerel,
        "Ostracod (seed shrimp)": ostracod,
        "Swimming crab": crab,
        "Mossy red seaweed": mossy,
        "Sea lettuce": lettuce,
        "Dinoflagellate (phytoplankton)": dinoflagellate,
        "Sea sparkle (bioluminescent dinoflagellate)": sparkle,
    }
    const containerRef = useRef(null);
    const mapRef = useRef(null);

    // Color palette for different datasets
    const colors = [
        '#FF6B6B', '#4ECDC4', '#45B7D1', '#96CEB4', '#FECA57',
        '#FF9FF3', '#54A0FF', '#5F27CD', '#00D2D3', '#FF9F43',
        '#A55EEA', '#26DE81', '#FC427B', '#FD79A8', '#FDCB6E'
    ];

    const API_BASE_URL = 'https://sih-oceanic-project.onrender.com';

    useEffect(() => {
        const handleClickOutside = (event) => {
            if (containerRef.current && !containerRef.current.contains(event.target)) {
                setopenlist(null);
            }
        };
        document.addEventListener("mousedown", handleClickOutside);
        return () => {
            document.removeEventListener("mousedown", handleClickOutside);
        };
    }, []);

    const showStatus = (message, type) => {
        setStatus(message);
        if (type === 'error') {
            setTimeout(() => setStatus(''), 5000);
        }
    };
    const dropquery = (pos) => {
        setFishPos(pos)
        const center = [pos.lng, pos.lat];
        const radius = 300; // in kilometers
        const options = { steps: 64, units: 'kilometers' };
        const circle = turf.circle(center, radius, options);

        // 3. Get the bounding box of the circle
        const boundingBox = turf.bbox(circle);
        const dropcoordinates = {
            west: boundingBox[0],
            south: boundingBox[1],
            east: boundingBox[2],
            north: boundingBox[3]
        };
        sendQuery("find all fishes in this area", dropcoordinates);
    }
    const sendQuery = async (q, dropcoords = null) => {
        setpop([]);
        setGeoJsonData({});
        const finalquery = (q || query).trim();
        if (!finalquery) {
            showStatus('Please enter a query', 'error');
            return;
        }

        setLoading(true);
        showStatus('Processing your query...', 'loading');

        let bounds = null;
        if (dropcoords) {
            bounds = dropcoords;
        }
        else if (mapRef.current) {
            setFishPos(null);
            const map = mapRef.current;
            const b = map.getBounds();
            bounds = {
                north: b.getNorth(),
                south: b.getSouth(),
                east: b.getEast(),
                west: b.getWest(),
            };
        }

        const payload = {
            prompt: finalquery.trim(),
            coordinates: bounds, // ✅ send current map bounds
        };

        try {
            const response = await fetch(`${API_BASE_URL}/query`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(payload)
            });

            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            const result = await response.json();
            handleQueryResult(result, finalquery);

        } catch (error) {
            console.error('Query error:', error);
            showStatus(`Error: ${error.message}`, 'error');
        } finally {
            setLoading(false);
        }
    };

    const handleQueryResult = (result, q) => {
        if (result.status === 'success') {
            setGeoJsonData(result.data);
            setTimeout(() => {
                showStatus(`Query successful! Found ${result.summary.total_features} results`, 'success');

                // remove the message after 3 seconds
                setTimeout(() => {
                    showStatus(null, null); // or showStatus("", "")
                }, 3000);
            }, 2000);
            if (Object.keys(images).includes(q)) { setpop([]); setpop((prev) => [q]); }



            else {
                const names = [];
                Object.values(result.data).forEach(geojson => {
                    geojson.features.forEach(f => {
                        if (f.properties?.species || f.properties?.ScientificNames) {
                            names.push(f.properties.species);
                        }
                    });
                });
                setpop(prev => {
                    const newResults = [...new Set(names)];
                    // filter out any already pinned items
                    const filtered = newResults.filter(n => !pinned.includes(n));
                    return filtered;
                });
            }



            // clear query box
            setQuery("");
            // Fit map to data after a short delay to ensure layers are rendered
            setTimeout(() => {
                if (mapRef.current && Object.keys(result.data).length > 0) {
                    const map = mapRef.current;
                    const group = new L.featureGroup();

                    // Add all GeoJSON data to the feature group for bounds calculation
                    Object.values(result.data).forEach(geojson => {
                        const layer = L.geoJSON(geojson);
                        group.addLayer(layer);
                    });

                    if (group.getBounds().isValid()) {
                        map.fitBounds(group.getBounds().pad(0.1));
                    }
                }
            }, 100);
        } else {
            showStatus('Query failed: ' + JSON.stringify(result), 'error');
        }
    };

    const handleKeyPress = (e) => {
        if (e.key === 'Enter') {
            sendQuery();
        }
    };

    const dropdown = (a) => {
        setopenlist(openlist === a ? null : a);
    };

    const selectItem = (item) => {
        setQuery(item);
        setopenlist(null);
    };
    const sharkIcon = L.divIcon({
        html: "🦈",
        className: "",
        iconSize: [32, 32],
        iconAnchor: [16, 16],
    });

    return (
        <div className="relative flex w-full h-screen">
            {/* Leaflet Map */}
            <MapContainer
                center={[25, 25]}
                zoom={2.5}
                style={{ height: '100vh', width: '100%' }}
                className="w-full h-full"
                worldCopyJump={false}
                maxBounds={[
                    [-90, -180],
                    [90, 180]
                ]}
                maxBoundsViscosity={1.0} // keeps the map locked in bounds
                ref={mapRef}
            >
                <TileLayer
                    url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
                    attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>'
                // ✅ prevents map repetition
                />

                <BoundsUpdater />
                <DropHandler onDropMarker={dropquery} />

                {fishPos && (
                    <Marker position={fishPos} icon={fishIcon}>
                        <Popup>🦈Dropped here!</Popup>
                    </Marker>
                )}

                <QueryResultsLayer geoJsonData={geoJsonData} pinnedGeoJsonData={pinnedGeoJsonData} colors={colors} />
            </MapContainer>


            {/* Floating Category Buttons */}
            <div ref={containerRef} className="absolute flex justify-center top-4 left-1/2 transform -translate-x-1/2 z-[3000] w-4/5 gap-3 " >
                <div className=" flex  w-1/6 h-full " >
                    <button className="flex w-full justify-center hover:border-white border-2 border-blue-400 bg-white hover:bg-blue-500 hover:text-white px-3 py-1 " style={{ borderRadius: '20px', height: '100%', fontSize: '1.4vw', alignItems: 'center' }} onClick={() => dropdown("animals")}>
                        Aquatic animals
                    </button>
                    {openlist === "animals" && (
                        <div className="absolute  top-full w-1/6 bg-white border rounded shadow-md z-[3000]" >
                            <ul className="text-sm" style={{ alignItems: 'center', justifyContent: 'center' }} >
                                {["Yellowfin Tuna", "Clark's Clownfish", "Indian Oil Sardine", "Indian Anchovey", "Indian Mackerel", "Ostracod (seed shrimp)", "Sea firefly (bioluminescent ostracod)", "Swimming crab"].map((item) => (
                                    <li key={item} className="px-3 py-2 hover:bg-blue-200 justify-center cursor-pointer" style={{ fontSize: '1.5vw' }} onClick={() => { selectItem(item); sendQuery(item) }}>
                                        {item}
                                    </li>
                                ))}
                            </ul>
                        </div>
                    )}
                </div>

                <div className="  flex w-1/6 justify-center  h-full" >
                    <button className="flex w-full justify-center  hover:border-white border-2 border-green-500 bg-white hover:bg-green-500 hover:text-white px-3 py-1 " style={{ borderRadius: '20px', height: '100%', fontSize: '1.5vw' }} onClick={() => { dropdown("plants") }}>
                        Aquatic Plants
                    </button>
                    {openlist === "plants" && (
                        <div className="absolute top-full  w-1/6 bg-white border rounded shadow-md" >
                            <ul className="text-sm" style={{ alignItems: 'center', justifyContent: 'center' }}>
                                {["Mossy red seaweed", "Sea lettuce", "Dinoflagellate (phytoplankton)", "Sea sparkle (bioluminescent dinoflagellate)"].map((item) => (
                                    <li key={item} className="px-3 py-2 justify-center hover:bg-green-200 cursor-pointer" style={{ fontSize: '1.5vw' }} onClick={() => { selectItem(item); sendQuery(item) }} >
                                        {item}
                                    </li>
                                ))}
                            </ul>
                        </div>
                    )}
                </div>

                <button className="flex w-1/6 justify-center  hover:border-white border-2 border-orange-700 bg-white hover:bg-orange-950 hover:text-white px-3 py-1 " style={{ borderRadius: '20px', height: '100%', fontSize: '1.5vw', justifyContent: 'center', alignItems: 'center' }} onClick={() => { selectItem("Petroleum"); sendQuery("Petroleum") }}>
                    Petroleum
                </button>
                <button className="w-1/6 flex justify-center h-1/2  hover:border-white border-2 border-red-700 bg-white hover:bg-red-800 hover:text-white px-3 py-1" style={{ borderRadius: '20px', height: '100%', fontSize: '1.5vw', alignItems: 'center' }} onClick={() => { selectItem("Shipwrecks"); sendQuery("Shipwrecks") }}>
                    Shipwrecks
                </button>
                <button className="w-1/6 flex justify-center h-1/2 hover:border-white border-2 border-green-900 bg-white hover:bg-green-950 hover:text-white px-3 py-1 " style={{ borderRadius: '20px', height: '100%', fontSize: '1.5vw', alignItems: 'center' }} onClick={() => { selectItem("Pollution"); sendQuery("Pollution") }}>
                    Pollution
                </button>
            </div>

            {/* Clear Button */}
            <span
                role="img"
                aria-label="fish"
                draggable
                className="absolute top-4 right-4 text-4xl cursor-grab z-[2000]"
                onDragStart={(e) => {
                    e.dataTransfer.setData("text/plain", "fish");
                }}
            >
                🦈
            </span>
            {pop.length > 0 || pinned.length > 0 ? (
                <div
                    className="absolute flex-col w-1/5 left-4 h-[calc(100%-2rem)] overflow-y-scroll top-10 bottom-4 z-[1000]"
                    style={{ msOverflowStyle: "none", scrollbarWidth: "none" }}
                >
                    {/* Pinned Items */}
                    {pinned.map((name, i) => (
                        <div
                            key={`pinned-${i}`}
                            className="flex-col items-center gap-4 mt-4 rounded-lg bg-yellow-100 px-2 py-2"
                            style={{ height: "auto", maxHeight: '50%', zIndex: '3' }}
                        >
                            <img
                                src={images[name]}
                                alt={name}
                                className="w-full object-cover"
                                style={{ height: "65%", borderRadius: "10px" }}
                            />
                            <div className="flex flex-col items-center">
                                <span className="font-medium">📌 {name}</span>
                                <a href="#" className="text-blue-500 hover:underline text-sm">
                                    Read more..
                                </a>
                                <button
                                    className="mt-1 px-2 py-1 bg-red-500 text-white rounded hover:bg-red-600"
                                    style={{ fontSize: "0.9rem" }}
                                    onClick={() => {
                                        setpinned((prev) => prev.filter((item) => item !== name));
                                        setPinnedGeoJsonData((prev) => {
        const newPinnedGeoJson = { ...prev };
        Object.keys(newPinnedGeoJson).forEach((filename) => {
          newPinnedGeoJson[filename].features = newPinnedGeoJson[filename].features.filter(
            f => (f.properties?.species || f.properties?.ScientificNames) !== name
          );
          if (newPinnedGeoJson[filename].features.length === 0) {
            delete newPinnedGeoJson[filename];
          }
        });
        return newPinnedGeoJson;
      });
                                        setpop((prev) => [...prev, name]);
                                    }}
                                >
                                    Unpin
                                </button>
                            </div>
                        </div>
                    ))}
                    {/* Search Result Items */}
                    {pop.map((name, i) => (
                        <div
                            key={`pop-${i}`}
                            className="flex-col items-center gap-4 mt-4 rounded-lg bg-white px-2 py-2"
                            style={{ height: "auto", maxHeight: '50%', zIndex: '2' }}
                        >
                            <img
                                src={images[name]}
                                alt={name}
                                className="w-full object-cover"
                                style={{ height: "65%", borderRadius: "10px" }}
                            />
                            <div className="flex flex-col items-center">
                                <span className="font-medium">{name}</span>
                                <a href="#" className="text-blue-500 hover:underline text-sm">
                                    Read more..
                                </a>
                                <button
                                    className="mt-1 px-2 py-1 bg-blue-500 text-white rounded hover:bg-blue-600"
                                    style={{ fontSize: "0.9rem" }}
                                    onClick={() => {
                                        if (!pinned.includes(name)) {
                                            setpinned((prev) => [name, ...prev]); // Add to top of pinned list
                                            const geoJsonForName = Object.entries(geoJsonData).reduce((acc, [filename, geojson]) => {
        const features = geojson.features.filter(f => 
          (f.properties?.species || f.properties?.ScientificNames) === name
        );
        if (features.length > 0) {
          acc[filename] = { ...geojson, features };
        }
        return acc;
      }, {});
      setPinnedGeoJsonData((prev) => ({ ...prev, ...geoJsonForName }));
                                            setpop((prev) => prev.filter((item) => item !== name)); // Remove from pop
                                        }
                                    }}
                                    /* onDoubleClick={() => {
                                        if (pinned.includes(name)) {
                                            setpinned((prev) => prev.filter((item) => item !== name)); // Remove from pinned
                                             // Add back to pop
                                        }
                                    }} */
                                >
                                    {pinned.includes(name) ? "Unpin" : "Pin"}
                                </button>
                            </div>
                        </div>
                    ))}
                </div>
            ) : null}
            {/* Search Input */}
            <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2 z-[1000] w-1/2 flex gap-2 rounded-full">
                <input
                    type="text"
                    placeholder="Search for oceanic data... "
                    className="px-4 py-3 rounded-full border border-gray-300 flex-1 "
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    onKeyDown={handleKeyPress}
                    disabled={loading}
                />
                {/* <button
          onClick={sendQuery}
          onKeyDown={sendQuery}
          disabled={loading || !query.trim()}
          className="px-6 py-3 bg-blue-500 text-white rounded-md hover:bg-blue-600 disabled:bg-gray-400 disabled:cursor-not-allowed shadow"
        >
          {loading ? (
            <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" ></div>
          ) : (
            "Search"
          )}
        </button> */}
            </div>

            {/* Status Messages */}
            {status && (
                <div className="absolute bottom-20 left-1/2 transform -translate-x-1/2 z-[1000] max-w-md">
                    <div className={`px-4 py-2 rounded shadow-lg ${status.includes('Error') || status.includes('failed')
                        ? 'bg-red-100 text-red-700 border border-red-300'
                        : status.includes('successful')
                            ? 'bg-green-100 text-green-700 border border-green-300'
                            : 'bg-blue-100 text-blue-700 border border-blue-300'
                        }`}>
                        {status}
                    </div>
                </div>
            )}
            {droppedMarkers.length > 0 && (
                <div className="absolute bottom-4 left-4 bg-white px-4 py-2 rounded-lg shadow-md z-[2000] text-sm font-mono max-h-40 overflow-y-auto">
                    {droppedMarkers.map((pos, i) => (
                        <div key={i}>
                            📍 {i + 1}: Lat {pos[0].toFixed(6)}, Lng {pos[1].toFixed(6)}
                        </div>
                    ))}
                </div>
            )}

        </div>
    );
}