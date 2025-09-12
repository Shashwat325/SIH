import React from "react";
import { useState, useEffect, useRef } from "react";
import { MapContainer, TileLayer, useMapEvents, GeoJSON, Marker, Popup, useMap } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import Tuna from '/src/assets/Yellowfin Tuna.jpg';
import clownfish from '/src/assets/Clarks clownfish.jpg';
import sardine from '/src/assets/Indian oil sardine.jpg';
import anchovy from '/src/assets/Indian anchovy.jpg';
import mackerel from '/src/assets/mackerel.jpg';
import firefly from '/src/assets/Sea firefly (bioluminescent ostracod).jpg';
import crab from '/src/assets/Swimming crab.jpg';
import ostracod from '/src/assets/Ostracod.jpg';
import mossy from '/src/assets/Mossy red seaweed.jpg';
import lettuce from '/src/assets/Sea lettuce.jpg';
import dinoflagellate from '/src/assets/Dinoflagellate (phytoplankton).jpg';
import sparkle from '/src/assets/Sea sparkle (bioluminescent dinoflagellate).jpg';
import * as turf from '@turf/turf';
import Magelona from '/src/assets/Magelona cincta (polychaete worm).png';
import Lumibrineris from '/src/assets/Lumibrineris latreilli (bristle worm).png';
import Flaccisagitta from '/src/assets/Flaccisagitta enflata (arrow worm).png';
import Euconchoecia from '/src/assets/Euconchoecia aculeata (ostracod).png';
import Cossura from '/src/assets/Cossura coasta (segmented worm).png';
import Conchoecetta from '/src/assets/Conchoecetta giesbrechti (ostracod).png';
import Tripods  from '/src/assets/Tripods furca (copepod).png';
import Siriella from '/src/assets/Siriella gracilis (opossum shrimp).png';
import Sigambra from '/src/assets/Sigambra parva (polychaete worm).png';
import Serratosagitta from '/src/assets/Serratosagitta pacifica (arrow worm).png';
import Pterosagitta from '/src/assets/Pterosagitta draco (arrow worm).png';
import Pseudanchialina  from '/src/assets/Pseudanchialina pusilla (opossum shrimp).png';
import Proceroecia  from '/src/assets/Proceroecia procera (ostracod).png';
import Paraprionospio  from '/src/assets/Paraprionospio pinnata (polychaete worm).png';
import Orthoconchoecia  from '/src/assets/Orthoconchoecia atlantica (ostracod).png';
import Thalassionema from '/src/assets/Thalassionema nitzschioides (diatom).png';
import Rhizosolenia from '/src/assets/Rhizosolenia hebetata (diatom).png';
import Proboscia  from '/src/assets/Proboscia alata (diatom).png';
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
                Object.keys(feature.properties).forEach((key) => {
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
      onDropMarker(latlng);
    };
    const handleDragOver = (e) => e.preventDefault();
    container.addEventListener("dragover", handleDragOver);
    container.addEventListener("drop", handleDrop);
    return () => {
      container.removeEventListener("dragover", handleDragOver);
      container.removeEventListener("drop", handleDrop);
    };
  }, [map, onDropMarker]);
  return null;
}

export default function MapComponent() {
  const [openlist, setOpenlist] = useState(null);
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(false);
  const [geoJsonData, setGeoJsonData] = useState({});
  const [droppedMarkers, setDroppedMarkers] = useState([]);
  const [pop, setPop] = useState([]);
  const [fishPos, setFishPos] = useState(null);
  const [pinned, setPinned] = useState([]);
  const [pinnedGeoJsonData, setPinnedGeoJsonData] = useState({});

  const fishIcon = new L.DivIcon({
    html: "🦈",
    className: "fish-icon",
    iconSize: [30, 30],
    iconAnchor: [15, 15],
  });

  const [status, setStatus] = useState("");

  const images = {
    "Yellowfin Tuna": Tuna,
    "Clark's Clownfish": clownfish,
    "Indian Oil Sardine": sardine,
    "Indian Anchovy": anchovy,
    "Indian Mackerel": mackerel,
    "Ostracod (seed shrimp)": ostracod,
    "Sea firefly (bioluminescent ostracod)": firefly,
    "Swimming crab": crab,
    "Magelona cincta (polychaete worm)" : Magelona,
    "Lumibrineris latreilli (bristle worm)" : Lumibrineris,
    "Flaccisagitta enflata (arrow worm)" : Flaccisagitta,
    "Euconchoecia aculeata (ostracod)" : Euconchoecia,
    "Cossura coasta (segmented worm)" : Cossura,
    "Conchoecetta giesbrechti (ostracod)" : Conchoecetta,
    "Tripods furca (copepod)" : Tripods,
    "Siriella gracilis (opossum shrimp)" : Siriella,
    "Sigambra parva (polychaete worm)" : Sigambra,
    "Serratosagitta pacifica (arrow worm)" : Serratosagitta,
    "Pterosagitta draco (arrow worm)" : Pterosagitta,
    "Pseudanchialina pusilla (opossum shrimp)" : Pseudanchialina,
    "Proceroecia procera (ostracod)" : Proceroecia,
    "Paraprionospio pinnata (polychaete worm)" : Paraprionospio,
    "Orthoconchoecia atlantica (ostracod)" : Orthoconchoecia,
    "Mossy red seaweed": mossy,
    "Sea lettuce": lettuce,
    "Dinoflagellate (phytoplankton)": dinoflagellate,
    "Sea sparkle (bioluminescent dinoflagellate)": sparkle,
    "Thalassionema nitzschioides (diatom)": Thalassionema,
    "Rhizosolenia hebetata (diatom)": Rhizosolenia,
    "Proboscia alata (diatom)": Proboscia,
  };

  const containerRef = useRef(null);
  const mapRef = useRef(null);

  const colors = [
    '#FF6B6B', '#4ECDC4', '#45B7D1', '#96CEB4', '#FECA57',
    '#FF9FF3', '#54A0FF', '#5F27CD', '#00D2D3', '#FF9F43',
    '#A55EEA', '#26DE81', '#FC427B', '#FD79A8', '#FDCB6E'
  ];

  const API_BASE_URL = 'https://sih-oceanic-project.onrender.com';

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (containerRef.current && !containerRef.current.contains(event.target)) {
        setOpenlist(null);
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

  const dropQuery = (pos) => {
    setFishPos(pos);
    const center = [pos.lng, pos.lat];
    const radius = 300; // in kilometers
    const options = { steps: 64, units: 'kilometers' };
    const circle = turf.circle(center, radius, options);
    const boundingBox = turf.bbox(circle);
    const dropCoordinates = {
      west: boundingBox[0],
      south: boundingBox[1],
      east: boundingBox[2],
      north: boundingBox[3],
    };
    sendQuery("find all fishes and plants in this area", dropCoordinates);
  };

  const sendQuery = async (q, dropCoords = null) => {
    setPop([]);
    setGeoJsonData({}); // Clear only non-pinned data
    const finalQuery = (q || query).trim();
    if (!finalQuery) {
      showStatus('Please enter a query', 'error');
      return;
    }
    setLoading(true);
    showStatus('Processing your query...', 'loading');
    let bounds = null;
    if (dropCoords) {
      bounds = dropCoords;
    } else if (mapRef.current) {
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
      prompt: finalQuery.trim(),
      coordinates: bounds,
    };
    try {
      const response = await fetch(`${API_BASE_URL}/query`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      const result = await response.json();
      handleQueryResult(result, finalQuery);
    } catch (error) {
      console.error('Query error:', error);
      showStatus(`Error: ${error.message}`, 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleQueryResult = (result, q) => {
    if (result.status === 'success') {
      setGeoJsonData(result.data); // Update non-pinned data only
      setTimeout(() => {
        showStatus(`Query successful! Found ${result.summary.total_features} results`, 'success');
        setTimeout(() => setStatus(''), 3000);
      }, 2000);
      if (Object.keys(images).includes(q)) {
        setPop([q]);
      } else {
        const names = [];
        Object.values(result.data).forEach((geojson) => {
          geojson.features.forEach((f) => {
            if (f.properties?.species || f.properties?.ScientificNames) {
              names.push(f.properties.species || f.properties.ScientificNames);
            }
          });
        });
        setPop((prev) => {
          const newResults = [...new Set(names)];
          const filtered = newResults.filter((n) => !pinned.includes(n));
          return filtered;
        });
      }
      setQuery("");
      setTimeout(() => {
        if (mapRef.current && Object.keys(result.data).length > 0) {
          const map = mapRef.current;
          const group = new L.featureGroup();
          // Include both new and pinned data for bounds calculation
          Object.values({ ...result.data, ...pinnedGeoJsonData }).forEach((geojson) => {
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
    setOpenlist(openlist === a ? null : a);
  };

  const selectItem = (item) => {
    setQuery(item);
    setOpenlist(null);
  };

  return (
    <div className="relative flex w-full h-screen">
      <MapContainer
        center={[25, 25]}
        zoom={2.5}
        style={{ height: '100vh', width: '100%' }}
        className="w-full h-full"
        worldCopyJump={false}
        maxBounds={[[-90, -180], [90, 180]]}
        maxBoundsViscosity={1.0}
        ref={mapRef}
      >
        <TileLayer
          url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>'
        />
        <BoundsUpdater />
        <DropHandler onDropMarker={dropQuery} />
        {fishPos && (
          <Marker position={fishPos} icon={fishIcon}>
            <Popup>🦈 Dropped here!</Popup>
          </Marker>
        )}
        <QueryResultsLayer
          geoJsonData={geoJsonData}
          pinnedGeoJsonData={pinnedGeoJsonData}
          colors={colors}
        />
      </MapContainer>
      {/* Floating Category Buttons */}
      <div ref={containerRef} className="absolute flex justify-center top-4 left-1/2 transform -translate-x-1/2 z-[1000] w-4/5 gap-3">
      {/* Dropdown for Aquatic animals */}
      <div className="relative">
        <button 
            className="flex w-full justify-center hover:border-white border-2 border-blue-400 bg-white hover:bg-blue-500 px-3 py-2 rounded-full shadow" 
            onClick={() => dropdown("animals")}
        >
            <span className="text-black">Aquatic animals</span>
        </button>
        {openlist === "animals" && (
            <div className="absolute top-full mt-2 w-48 bg-white border rounded shadow-md z-[1001] max-h-80 overflow-y-auto">
                <ul className="text-sm">
                    {["Yellowfin Tuna", "Clark's Clownfish", "Indian Oil Sardine", "Indian Anchovy", "Indian Mackerel", "Ostracod (seed shrimp)", "Sea firefly (bioluminescent ostracod)", "Swimming crab","Magelona cincta (polychaete worm)","Lumibrineris latreilli (bristle worm)","Flaccisagitta enflata (arrow worm)","Euconchoecia aculeata (ostracod)","Cossura coasta (segmented worm)","Conchoecetta giesbrechti (ostracod)","Tripods furca (copepod)","Siriella gracilis (opossum shrimp)","Sigambra parva (polychaete worm)","Serratosagitta pacifica (arrow worm)","Pterosagitta draco (arrow worm)","Pseudanchialina pusilla (opossum shrimp)","Proceroecia procera (ostracod)","Paraprionospio pinnata (polychaete worm)","Orthoconchoecia atlantica (ostracod)"].map((item) => (
                        <li 
                            key={item} 
                            className="px-3 py-2 hover:bg-blue-200 cursor-pointer text-black" 
                            onClick={() => { selectItem(item); sendQuery(item) }}
                        >
                            {item}
                        </li>
                    ))}
                </ul>
             </div>
        )}
          </div>

    {/* Dropdown for Aquatic Plants */}
    <div className="relative">
        <button 
            className="flex w-full justify-center hover:border-white border-2 border-green-500 bg-white hover:bg-green-500 px-3 py-2 rounded-full" 
            onClick={() => { dropdown("plants") }}
        >
            <span className="text-black">Aquatic Plants</span>
        </button>
        {openlist === "plants" && (
            <div className="absolute top-full mt-2 w-48 bg-white border rounded shadow-md z-[1001] max-h-80 overflow-y-auto">
                <ul className="text-sm">
                    {["Mossy red seaweed", "Sea lettuce", "Dinoflagellate (phytoplankton)", "Sea sparkle (bioluminescent dinoflagellate)","Thalassionema nitzschioides (diatom)","Rhizosolenia hebetata (diatom)","Proboscia alata (diatom)"].map((item) => (
                        <li 
                            key={item} 
                            className="px-3 py-2 hover:bg-green-200 cursor-pointer text-black" 
                            onClick={() => { selectItem(item); sendQuery(item) }}
                        >
                            {item}
                        </li>
                    ))}
                </ul>
             </div>
         )}
    </div>

    {/* Static Buttons */}
    <button 
        className="flex w-1/6 justify-center hover:border-white border-2 border-orange-700 bg-white hover:bg-orange-950 px-3 py-2 rounded-full" 
        onClick={() => { selectItem("Petroleum"); sendQuery("Petroleum") }}
    >
        <span className="text-black">Petroleum</span>
    </button>
    <button 
        className="w-1/6 flex justify-center hover:border-white border-2 border-red-700 bg-white hover:bg-red-800 px-3 py-2 rounded-full" 
        onClick={() => { selectItem("Shipwrecks"); sendQuery("Shipwrecks") }}
    >
        <span className="text-black">Shipwrecks</span>
    </button>
    <button 
        className="w-1/6 flex justify-center hover:border-white border-2 border-green-900 bg-white hover:bg-green-950 px-3 py-2 rounded-full" 
        onClick={() => { selectItem("Pollution"); sendQuery("Pollution") }}
    >
        <span className="text-black">Pollution</span>
        </button>
      </div>
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
      {(pop.length > 0 || pinned.length > 0) && (
        <div
          className="absolute flex-col w-1/5 left-4 h-[calc(100%-2rem)] overflow-y-scroll top-10 bottom-4 z-[1000]"
          style={{ msOverflowStyle: "none", scrollbarWidth: "none" }}
        >
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
    // Remove from pinned
    setPinned((prev) => prev.filter((item) => item !== name));

    // Check if the item is in the current query results
    const isInCurrentQuery = Object.values(geoJsonData).some((geojson) =>
      geojson.features.some(
        (f) => (f.properties?.species || f.properties?.ScientificNames) === name
      )
    );

    // If in current query, add to pop (ensuring no duplicates)
    if (isInCurrentQuery && !pop.includes(name)) {
      setPop((prev) => [...prev, name]);
    }

    // If not in current query, remove from pinnedGeoJsonData
    if (!isInCurrentQuery) {
      setPinnedGeoJsonData((prev) => {
        const newPinnedGeoJson = { ...prev };
        Object.keys(newPinnedGeoJson).forEach((filename) => {
          newPinnedGeoJson[filename].features = newPinnedGeoJson[filename].features.filter(
            (f) => (f.properties?.species || f.properties?.ScientificNames) !== name
          );
          if (newPinnedGeoJson[filename].features.length === 0) {
            delete newPinnedGeoJson[filename];
          }
        });
        return newPinnedGeoJson;
      });
    }

    // Show status message
    showStatus(`Unpinned ${name}`, "success");
    setTimeout(() => setStatus(""), 3000);

    // Update map bounds
    if (mapRef.current) {
      const map = mapRef.current;
      const group = new L.featureGroup();
      Object.values({ ...geoJsonData, ...pinnedGeoJsonData }).forEach((geojson) => {
        const layer = L.geoJSON(geojson);
        group.addLayer(layer);
      });
      if (group.getBounds().isValid()) {
        map.fitBounds(group.getBounds().pad(0.1));
      } else {
        map.setView([25, 25], 2.5); // Reset to default view
      }
    }
  }}
>
  Unpin
</button>
              </div>
            </div>
          ))}
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
                      setPinned((prev) => [name, ...prev]);
                      const geoJsonForName = Object.entries(geoJsonData).reduce((acc, [filename, geojson]) => {
                        const features = geojson.features.filter(
                          (f) => (f.properties?.species || f.properties?.ScientificNames) === name
                        );
                        if (features.length > 0) {
                          acc[filename] = { ...geojson, features };
                        }
                        return acc;
                      }, {});
                      setPinnedGeoJsonData((prev) => ({ ...prev, ...geoJsonForName }));
                      setPop((prev) => prev.filter((item) => item !== name));
                    }
                  }}
                >
                  {pinned.includes(name) ? "Unpin" : "Pin"}
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
      <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2 z-[1000] w-1/2 flex gap-2 rounded-full">
        <input
          type="text"
          placeholder="Search for oceanic data..."
          className="px-4 py-3 rounded-full border border-gray-300 flex-1"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={handleKeyPress}
          disabled={loading}
        />
      </div>
      {status && (
        <div className="absolute bottom-20 left-1/2 transform -translate-x-1/2 z-[1000] max-w-md">
          <div
            className={`px-4 py-2 rounded shadow-lg ${
              status.includes('Error') || status.includes('failed')
                ? 'bg-red-100 text-red-700 border border-red-300'
                : status.includes('successful')
                ? 'bg-green-100 text-green-700 border border-green-300'
                : 'bg-blue-100 text-blue-700 border border-blue-300'
            }`}
          >
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