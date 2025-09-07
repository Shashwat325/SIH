"use client";

import React from "react";
import { useState, useEffect, useRef } from "react";
import { MapContainer, TileLayer, useMapEvents, GeoJSON } from "react-leaflet";
import L from "leaflet";
import * as turf from "@turf/turf";
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

import dinoflagellate from '/src/assets/Dinoflagellate (phytoplankton).jpg';
import sparkle from '/src/assets/Sea sparkle (bioluminescent dinoflagellate).jpg';
function BoundsUpdater() {
    const map = useMapEvents({
        zoomend: () => {
            if (!map._initialLockDone) {
                map._initialLockDone = true;
            }
            map.setMaxBounds(map.getBounds());
        },
        moveend: () => {
            if (map._initialLockDone) {
                map.setMaxBounds(map.getBounds());
            }
        },
    });

    useEffect(() => {
        const worldBounds = L.latLngBounds(
            [-90, -180],
            [90, 180]
        );
        map.setMaxBounds(worldBounds);
    }, [map]);

    return null;
}

function QueryResultsLayer({ geoJsonData, colors }) {
    if (!geoJsonData || Object.keys(geoJsonData).length === 0) {
        return null;
    }

    return (
        <>
            {Object.entries(geoJsonData).map(([filename, geojson], index) => {
                const color = colors[index % colors.length];

                return (
                    <GeoJSON
                        key={`${filename}-${index}`}
                        data={geojson}
                        style={() => ({
                            color: color,
                            weight: 2,
                            opacity: 0.8,
                            fillOpacity: 0.6,
                            lineJoin: "round",
                        })}
                        pointToLayer={(feature, latlng) => {
                            return L.circleMarker(latlng, {
                                radius: 6,
                                fillColor: color,
                                color: '#fff',
                                weight: 1,
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
export default function MapComponet() {
    const [openlist, setopenlist] = useState(null);
    const [query, setQuery] = useState("");
    const [loading, setLoading] = useState(false);
    const [geoJsonData, setGeoJsonData] = useState({});
    const [pop, setpop] = useState([]);
    const [status, setStatus] = useState("");
    const images = {
        "Yellowfin Tuna": Tuna,
        "Clark's Clownfish": clownfish,
        "Sea firefly (bioluminescent ostracod)": firefly,
        "Indian Oil Sardine": sardine,
        "Indian Anchovy": anchovy,
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

    const sendQuery = async (q) => {
        setpop([]);
        const finalquery = (q || query).trim();
        if (!finalquery) {
            showStatus('Please enter a query', 'error');
            return;
        }

        setLoading(true);
        showStatus('Processing your query...', 'loading');

        const payload = {
            prompt: finalquery.trim()
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
            setpop((prev) => [...prev, q]);
            setQuery("")
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

    const clearMap = () => {
        setGeoJsonData({});
        setQuery('');
        showStatus('Map cleared', 'success');
    };

    const dropdown = (a) => {
        setopenlist(openlist === a ? null : a);
    };

    const selectItem = (item) => {
        setQuery(item);
        setopenlist(null);
    };

    return (
        <div className="relative flex w-full h-screen">
            {/* Leaflet Map */}
            <MapContainer
                center={[20, 0]}
                zoom={2}
                style={{ height: '100vh', width: '100%' }}
                className="w-full h-full"
                worldCopyJump={false}
                ref={mapRef}
            >
                <TileLayer
                    url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                    attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                />
                <BoundsUpdater />
                <QueryResultsLayer geoJsonData={geoJsonData} colors={colors} />
            </MapContainer>

            {/* Floating Category Buttons */}
            <div ref={containerRef} className="absolute flex justify-center top-4 left-1/2 transform -translate-x-1/2 z-[1000] w-4/5 gap-3">
                <button className="flex w-1/6 justify-center hover:border-white border-2 border-blue-400 bg-white hover:bg-blue-500 hover:text-white px-3 py-2 rounded-full shadow" onClick={() => dropdown("animals")}>
                    Aquatic animals
                </button>
                {openlist === "animals" && (
                    <div className="absolute top-full  w-1/6 bg-white border rounded shadow-md" style={{ left: '6%' }}>
                        <ul className="text-sm">
                            {["Yellowfin Tuna", "Clark's Clownfish", "Indian Oil Sardine", "Indian Anchovey", "Indian Mackerel", "Ostracod (seed shrimp)", "Sea firefly (bioluminescent ostracod)", "Swimming crab"].map((item) => (
                                <li key={item} className="px-3 py-2 hover:bg-blue-200 cursor-pointer" onClick={() => { selectItem(item); sendQuery(item) }}>
                                    {item}
                                </li>
                            ))}
                        </ul>
                    </div>
                )}

                <button className="flex w-1/6 justify-center  hover:border-white border-2 border-green-500 bg-white hover:bg-green-500 hover:text-white px-3 py-2 rounded-full" onClick={() => { dropdown("plants") }}>
                    Aquatic Plants
                </button>
                {openlist === "plants" && (
                    <div className="absolute top-full  w-1/6 bg-white border rounded shadow-md" style={{ left: '24%' }}>
                        <ul className="text-sm">
                            {["Mossy red seaweed", "Sea lettuce", "Dinoflagellate (phytoplankton)", "Sea sparkle (bioluminescent dinoflagellate)"].map((item) => (
                                <li key={item} className="px-3 py-2 hover:bg-green-200 cursor-pointer" onClick={() => { selectItem(item); sendQuery(item) }} >
                                    {item}
                                </li>
                            ))}
                        </ul>
                    </div>
                )}

                <button className="flex w-1/6 justify-center  hover:border-white border-2 border-orange-700 bg-white hover:bg-orange-950 hover:text-white px-3 py-2 rounded-full" onClick={() => { selectItem("Petroleum"); sendQuery("Petroleum") }}>
                    Petroleum
                </button>
                <button className="w-1/6 flex justify-center  hover:border-white border-2 border-red-700 bg-white hover:bg-red-800 hover:text-white px-3 py-2 rounded-full" onClick={() => { selectItem("Shipwrecks"); sendQuery("Shipwrecks") }}>
                    Shipwrecks
                </button>
                <button className="w-1/6 flex justify-center  hover:border-white border-2 border-green-900 bg-white hover:bg-green-950 hover:text-white px-3 py-2 rounded-full" onClick={() => { selectItem("Pollution"); sendQuery("Pollution") }}>
                    Pollution
                </button>
            </div>

            {/* Clear Button */}
            <div className="absolute flex justify-center top-4 z-[1000] w-auto" style={{ right: '4%' }}>
                <button

                    className="bg-white hover:bg-gray-200 px-4 py-2 rounded shadow border"
                >
                    Banda
                </button>
            </div>
            {pop.length > 0 && <div className="absolute flex-col w-1/5 left-4 h-100 overflow-y-scroll top-4 bottom-4 justify-center z-[1000]" style={{ msOverflowStyle: 'none', scrollbarWidth: 'none' }}>
                {pop.map((name, i) => {
                    return (
                        <div
                            key={i}
                            className="flex-col items-center gap-4 mt-10 rounded-lg bg-white px-1 py-1 " style={{ height: '30%' }}
                        >
                            <img src={images[name]} alt={name} className="w-full object-cover" style={{ height: '60%', borderRadius: '10px' }} />
                            <div className="flex flex-col">
                                <span className="font-medium">{name}</span>
                                <a href="#" className="text-blue-500 hover:underline text-sm">
                                    Read more..
                                </a>
                            </div>
                        </div>)
                })}
                {/* <div className=" flex mt-10 border-3 bg-white h-1/5 " style={{justifyContent:'center',alignItems:'center'}}>anday</div>
                <div className=" flex mt-10 border-3 bg-white h-1/5 " style={{justifyContent:'center',alignItems:'center'}}>anday</div>
                <div className=" flex mt-10 border-3 bg-white h-1/5 " style={{justifyContent:'center',alignItems:'center'}}>anday</div>
                <div className=" flex mt-10 border-3 bg-white h-1/5 " style={{justifyContent:'center',alignItems:'center'}}>anday</div>
                <div className=" flex mt-10 border-3 bg-white h-1/5 " style={{justifyContent:'center',alignItems:'center'}}>anday</div>
                <div className=" flex mt-10 border-3 bg-white h-1/5 " style={{justifyContent:'center',alignItems:'center'}}>anday</div>
                <div className=" flex mt-10 border-3 bg-white h-1/5 " style={{justifyContent:'center',alignItems:'center'}}>anday</div>
                <div className=" flex mt-10 border-3 bg-white h-1/5 " style={{justifyContent:'center',alignItems:'center'}}>anday</div>
                <div className=" flex mt-10 border-3 bg-white h-1/5 " style={{justifyContent:'center',alignItems:'center'}}>anday</div>
                <div className=" flex mt-10 border-3 bg-white h-1/5 " style={{justifyContent:'center',alignItems:'center'}}>anday</div>
 */}
            </div>}
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
        </div>
    );
}