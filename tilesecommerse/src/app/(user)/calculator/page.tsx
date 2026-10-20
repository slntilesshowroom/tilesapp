"use client";

import { useState } from "react";
import { FaPlus, FaTrash, FaCalculator } from "react-icons/fa";

export default function TileCalculator() {
    const [roomType, setRoomType] = useState("");
    const [spaceType, setSpaceType] = useState("");
    const [measurementType, setMeasurementType] = useState("dimensions");
    const [walls, setWalls] = useState([{ length: "", width: "" }]);
    const [tileSize, setTileSize] = useState("");
    const [customTileWidth, setCustomTileWidth] = useState("");
    const [customTileHeight, setCustomTileHeight] = useState("");
    const [addWaste, setAddWaste] = useState(true);
    const [wastePercentage, setWastePercentage] = useState("10");
    const [addGrout, setAddGrout] = useState(true);
    const [groutWidth, setGroutWidth] = useState("3");
    const [totalArea, setTotalArea] = useState(0);
    const [totalTiles, setTotalTiles] = useState(0);
    const [groutWeight, setGroutWeight] = useState(0);
    const [calculated, setCalculated] = useState(false);

    const addWall = () => {
        setWalls([...walls, { length: "", width: "" }]);
    };

    const removeWall = (index: number) => {
        setWalls(walls.filter((_, i) => i !== index));
    };

    const updateWall = (index: number, field: "length" | "width", value: string) => {
        const newWalls = [...walls];
        newWalls[index][field] = value;
        setWalls(newWalls);
    };

    // Get tile dimensions in inches
    const getTileDimensions = () => {
        if (!tileSize) return null;

        // Handle custom size
        if (tileSize === "custom") {
            const width = parseFloat(customTileWidth) || 0;
            const height = parseFloat(customTileHeight) || 0;
            if (width > 0 && height > 0) {
                return { width, height };
            }
            return null;
        }

        const sizes: { [key: string]: { width: number; height: number } } = {
            "12x12": { width: 12, height: 12 },
            "12x24": { width: 12, height: 24 },
            "18x18": { width: 18, height: 18 },
            "24x24": { width: 24, height: 24 },
            "24x48": { width: 24, height: 48 },
        };

        return sizes[tileSize] || null;
    };

    // Calculate total area from walls
    const calculateTotalArea = () => {
        let area = 0;

        walls.forEach(wall => {
            const length = parseFloat(wall.length) || 0;
            const width = parseFloat(wall.width) || 0;

            // Convert: length in feet, width in inches
            // Area in sq ft = (length in ft) * (width in inches / 12)
            area += length * (width / 12);
        });

        return area;
    };

    // Calculate number of tiles needed
    const calculateTiles = () => {
        const tileDims = getTileDimensions();
        if (!tileDims) return 0;

        let area = calculateTotalArea();

        // Account for grout spacing if enabled
        if (addGrout) {
            const groutInches = parseFloat(groutWidth) || 0;
            const groutFactor = 1 + (groutInches / 100); // Approximate adjustment
            area *= groutFactor;
        }

        // Calculate tile area in square feet
        const tileAreaSqFt = (tileDims.width * tileDims.height) / 144; // Convert sq inches to sq feet

        // Calculate base number of tiles
        let tilesNeeded = Math.ceil(area / tileAreaSqFt);

        // Add waste percentage if enabled
        if (addWaste) {
            const waste = parseFloat(wastePercentage) || 0;
            tilesNeeded = Math.ceil(tilesNeeded * (1 + waste / 100));
        }

        return tilesNeeded;
    };

    // Calculate grout weight in kg
    const calculateGroutWeight = () => {
        if (!addGrout) return 0;

        const tileDims = getTileDimensions();
        if (!tileDims) return 0;

        const area = calculateTotalArea();
        const groutWidthMm = parseFloat(groutWidth) || 0;

        // Approximate grout weight calculation
        // Formula: Area (sq ft) × Grout width (mm) × 0.15 (approximate factor for kg)
        const groutWeightKg = area * (groutWidthMm / 10) * 0.15;

        return groutWeightKg;
    };

    // Handle calculate button click
    const handleCalculate = () => {
        // Validation
        if (!roomType || !spaceType || !tileSize) {
            alert("Please fill in all required fields (Room Type, Space Type, and Tile Size)");
            return;
        }

        // Validate custom tile size if selected
        if (tileSize === "custom") {
            const width = parseFloat(customTileWidth) || 0;
            const height = parseFloat(customTileHeight) || 0;
            if (width <= 0 || height <= 0) {
                alert("Please enter valid custom tile dimensions (width and height)");
                return;
            }
        }

        const hasValidWall = walls.some(wall =>
            (parseFloat(wall.length) || 0) > 0 && (parseFloat(wall.width) || 0) > 0
        );

        if (!hasValidWall) {
            alert("Please enter at least one wall with valid dimensions");
            return;
        }

        // Calculate results
        const area = calculateTotalArea();
        const tiles = calculateTiles();
        const grout = calculateGroutWeight();

        setTotalArea(area);
        setTotalTiles(tiles);
        setGroutWeight(grout);
        setCalculated(true);

        // Scroll to results on mobile
        if (window.innerWidth < 1024) {
            setTimeout(() => {
                document.getElementById('results-panel')?.scrollIntoView({
                    behavior: 'smooth',
                    block: 'nearest'
                });
            }, 100);
        }
    };

    // Reset calculator
    const handleReset = () => {
        setRoomType("");
        setSpaceType("");
        setWalls([{ length: "", width: "" }]);
        setTileSize("");
        setCustomTileWidth("");
        setCustomTileHeight("");
        setAddWaste(true);
        setWastePercentage("10");
        setAddGrout(true);
        setGroutWidth("3");
        setTotalArea(0);
        setTotalTiles(0);
        setGroutWeight(0);
        setCalculated(false);
    };


    return (
        <div className="min-h-screen bg-gradient-to-br from-slate-50 to-gray-100 py-12">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                {/* Header */}
                <div className="text-center mb-12">
                    <div className="inline-flex items-center justify-center w-16 h-16 bg-gradient-to-r from-red-500 to-orange-500 rounded-full mb-4">
                        <FaCalculator className="text-white text-2xl" />
                    </div>
                    <h1 className="text-4xl font-bold bg-gradient-to-r from-red-600 to-orange-500 bg-clip-text text-transparent mb-4">
                        Tile Calculator
                    </h1>
                    <p className="text-lg text-gray-600 max-w-3xl mx-auto">
                        Estimate Tiles for Any Room, or Space
                    </p>
                    <p className="text-sm text-gray-500 mt-2 max-w-4xl mx-auto">
                        Tiles are not overwhelming, especially when you are choosing tiles online. The Tile Calculator by MyTiles is designed with the user in mind, and makes tile purchasing easier. We understand that "tiles is project," and this tool can help you save both by estimating the estimated cost and amount of tiles you will need.
                    </p>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                    {/* Calculator Form */}
                    <div className="lg:col-span-2">
                        <div className="bg-white rounded-2xl shadow-xl p-8">
                            {/* Room/Space Type */}
                            <div className="mb-8">
                                <h3 className="text-lg font-semibold text-slate-800 mb-4">
                                    Room / Space Type
                                </h3>

                                <div className="mb-4">
                                    <label className="block text-sm font-medium text-slate-700 mb-2">
                                        Room Type <span className="text-red-500">*</span>
                                    </label>
                                    <select
                                        value={roomType}
                                        onChange={(e) => setRoomType(e.target.value)}
                                        className="w-full px-4 py-3 border-2 border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-orange-500 transition-all"
                                    >
                                        <option value="">Select Room</option>
                                        <option value="bathroom">Bathroom</option>
                                        <option value="kitchen">Kitchen</option>
                                        <option value="living-room">Living Room</option>
                                        <option value="bedroom">Bedroom</option>
                                        <option value="outdoor">Outdoor</option>
                                    </select>
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-slate-700 mb-2">
                                        Space Type <span className="text-red-500">*</span>
                                    </label>
                                    <select
                                        value={spaceType}
                                        onChange={(e) => setSpaceType(e.target.value)}
                                        className="w-full px-4 py-3 border-2 border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-orange-500 transition-all"
                                    >
                                        <option value="">Select Space</option>
                                        <option value="floor">Floor</option>
                                        <option value="wall">Wall</option>
                                        <option value="both">Floor & Wall</option>
                                    </select>
                                </div>
                            </div>

                            {/* Area To Be Covered */}
                            <div className="mb-8">
                                <h3 className="text-lg font-semibold text-slate-800 mb-4">
                                    Area To Be Covered <span className="text-red-500">*</span>
                                </h3>

                                {/* Measurement Type Toggle */}
                                <div className="flex gap-4 mb-6">
                                    <label className="flex items-center cursor-pointer">
                                        <input
                                            type="radio"
                                            name="measurementType"
                                            value="dimensions"
                                            checked={measurementType === "dimensions"}
                                            onChange={(e) => setMeasurementType(e.target.value)}
                                            className="w-4 h-4 text-orange-500 focus:ring-orange-500"
                                        />
                                        <span className="ml-2 text-sm font-medium text-slate-700">
                                            Use Dimensions
                                        </span>
                                    </label>
                                    <label className="flex items-center cursor-pointer">
                                        <input
                                            type="radio"
                                            name="measurementType"
                                            value="totalArea"
                                            checked={measurementType === "totalArea"}
                                            onChange={(e) => setMeasurementType(e.target.value)}
                                            className="w-4 h-4 text-orange-500 focus:ring-orange-500"
                                        />
                                        <span className="ml-2 text-sm font-medium text-slate-700">
                                            Use Total Area
                                        </span>
                                    </label>
                                </div>

                                {/* Walls Input */}
                                {walls.map((wall, index) => (
                                    <div key={index} className="mb-4">
                                        <div className="flex items-center justify-between mb-2">
                                            <label className="text-sm font-medium text-slate-700">
                                                Wall {index + 1} <span className="text-red-500">*</span>
                                            </label>
                                            {walls.length > 1 && (
                                                <button
                                                    onClick={() => removeWall(index)}
                                                    className="text-red-500 hover:text-red-700 transition-colors"
                                                >
                                                    <FaTrash className="text-sm" />
                                                </button>
                                            )}
                                        </div>
                                        <div className="grid grid-cols-2 gap-4">
                                            <div>
                                                <label className="block text-xs text-gray-500 mb-1">Length</label>
                                                <div className="relative">
                                                    <input
                                                        type="number"
                                                        placeholder="Enter in Feet"
                                                        value={wall.length}
                                                        onChange={(e) => updateWall(index, "length", e.target.value)}
                                                        className="w-full px-4 py-3 border-2 border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-orange-500 transition-all"
                                                    />
                                                </div>
                                            </div>
                                            <div>
                                                <label className="block text-xs text-gray-500 mb-1">Width</label>
                                                <div className="relative">
                                                    <input
                                                        type="number"
                                                        placeholder="Enter in Feet"
                                                        value={wall.width}
                                                        onChange={(e) => updateWall(index, "width", e.target.value)}
                                                        className="w-full px-4 py-3 border-2 border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-orange-500 transition-all"
                                                    />
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                ))}

                                <button
                                    onClick={addWall}
                                    className="flex items-center gap-2 text-orange-500 hover:text-orange-600 font-medium transition-colors mt-2"
                                >
                                    <FaPlus className="text-sm" />
                                    <span>Add More</span>
                                </button>
                            </div>

                            {/* Tile Size */}
                            <div className="mb-8">
                                <label className="block text-sm font-medium text-slate-700 mb-2">
                                    Tile Size <span className="text-red-500">*</span>
                                </label>
                                <select
                                    value={tileSize}
                                    onChange={(e) => setTileSize(e.target.value)}
                                    className="w-full px-4 py-3 border-2 border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-orange-500 transition-all"
                                >
                                    <option value="">Select Tile Size</option>
                                    <option value="12x12">12" x 12"</option>
                                    <option value="12x24">12" x 24"</option>
                                    <option value="18x18">18" x 18"</option>
                                    <option value="24x24">24" x 24"</option>
                                    <option value="24x48">24" x 48"</option>
                                    <option value="custom">Custom Size</option>
                                </select>

                                {/* Custom Size Inputs */}
                                {tileSize === "custom" && (
                                    <div className="mt-4 grid grid-cols-2 gap-4 p-4 bg-orange-50 border border-orange-200 rounded-lg">
                                        <div>
                                            <label className="block text-xs text-gray-600 mb-1">
                                                Width <span className="text-red-500">*</span>
                                            </label>
                                            <input
                                                type="number"
                                                placeholder="Enter in inches"
                                                value={customTileWidth}
                                                onChange={(e) => setCustomTileWidth(e.target.value)}
                                                className="w-full px-4 py-3 border-2 border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-orange-500 transition-all"
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-xs text-gray-600 mb-1">
                                                Height <span className="text-red-500">*</span>
                                            </label>
                                            <input
                                                type="number"
                                                placeholder="Enter in inches"
                                                value={customTileHeight}
                                                onChange={(e) => setCustomTileHeight(e.target.value)}
                                                className="w-full px-4 py-3 border-2 border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-orange-500 transition-all"
                                            />
                                        </div>
                                    </div>
                                )}
                            </div>

                            {/* Additional Options */}
                            <div className="space-y-4 mb-8">
                                {/* Add Waste */}
                                <div className="flex items-center justify-between p-4 bg-orange-50 border border-orange-200 rounded-lg">
                                    <div className="flex items-center gap-2">
                                        <input
                                            type="checkbox"
                                            id="addWaste"
                                            checked={addWaste}
                                            onChange={(e) => setAddWaste(e.target.checked)}
                                            className="w-4 h-4 text-orange-500 rounded focus:ring-orange-500"
                                        />
                                        <label htmlFor="addWaste" className="text-sm font-medium text-slate-700 cursor-pointer">
                                            Add waste and reserve material
                                        </label>
                                        <span className="text-orange-500 text-xs">Yes</span>
                                    </div>
                                    <input
                                        type="number"
                                        value={wastePercentage}
                                        onChange={(e) => setWastePercentage(e.target.value)}
                                        disabled={!addWaste}
                                        className="w-20 px-3 py-2 border-2 border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500 disabled:bg-gray-100"
                                        placeholder="10%"
                                    />
                                </div>

                                {/* Add Grout */}
                                <div className="flex items-center justify-between p-4 bg-orange-50 border border-orange-200 rounded-lg">
                                    <div className="flex items-center gap-2">
                                        <input
                                            type="checkbox"
                                            id="addGrout"
                                            checked={addGrout}
                                            onChange={(e) => setAddGrout(e.target.checked)}
                                            className="w-4 h-4 text-orange-500 rounded focus:ring-orange-500"
                                        />
                                        <label htmlFor="addGrout" className="text-sm font-medium text-slate-700 cursor-pointer">
                                            Add Grout Width as
                                        </label>
                                        <span className="text-orange-500 text-xs">Yes</span>
                                    </div>
                                    <input
                                        type="number"
                                        value={groutWidth}
                                        onChange={(e) => setGroutWidth(e.target.value)}
                                        disabled={!addGrout}
                                        className="w-20 px-3 py-2 border-2 border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500 disabled:bg-gray-100"
                                        placeholder="3mm"
                                    />
                                </div>
                            </div>

                            {/* Action Buttons */}
                            <div className="flex gap-4">
                                <button
                                    onClick={handleReset}
                                    className="flex-1 px-6 py-4 border-2 border-orange-500 text-orange-500 font-semibold rounded-lg hover:bg-orange-50 transition-all"
                                >
                                    Reset
                                </button>
                                <button
                                    onClick={handleCalculate}
                                    className="flex-1 px-6 py-4 bg-gradient-to-r from-red-500 to-orange-500 text-white font-semibold rounded-lg hover:from-red-600 hover:to-orange-600 transition-all shadow-lg"
                                >
                                    Calculate
                                </button>
                            </div>
                        </div>
                    </div>

                    {/* Results Panel */}
                    <div className="lg:col-span-1">
                        <div id="results-panel" className="bg-white rounded-2xl shadow-xl p-8 sticky top-8">
                            <h3 className="text-2xl font-bold bg-gradient-to-r from-red-600 to-orange-500 bg-clip-text text-transparent mb-6 text-center">
                                Total
                            </h3>

                            <div className="space-y-6">
                                <div className="text-center">
                                    <p className="text-sm text-gray-500 mb-2">Total Tiles Required</p>
                                    <p className={`text-5xl font-bold transition-all duration-500 ${calculated ? 'text-orange-500 scale-110' : 'text-gray-300'
                                        }`}>
                                        {totalTiles.toLocaleString()}
                                    </p>
                                    <p className="text-sm text-gray-500 mt-1">pieces</p>
                                </div>

                                <div className="border-t border-gray-200 pt-6">
                                    <p className="text-sm text-gray-500 mb-2 text-center">Total Area</p>
                                    <p className={`text-4xl font-bold text-center transition-all duration-500 ${calculated ? 'text-orange-500 scale-110' : 'text-gray-300'
                                        }`}>
                                        {totalArea.toFixed(2)}
                                    </p>
                                    <p className="text-sm text-gray-500 mt-1 text-center">Sq. ft.</p>
                                </div>

                                {addGrout && (
                                    <div className="border-t border-gray-200 pt-6">
                                        <p className="text-sm text-gray-500 mb-2 text-center">Grout Weight</p>
                                        <p className={`text-3xl font-bold text-center transition-all duration-500 ${calculated ? 'text-orange-500 scale-110' : 'text-gray-300'
                                            }`}>
                                            {groutWeight.toFixed(2)}
                                        </p>
                                        <p className="text-sm text-gray-500 mt-1 text-center">kg</p>
                                    </div>
                                )}

                                {calculated ? (
                                    <div className="bg-gradient-to-r from-green-50 to-emerald-50 rounded-lg p-4 border border-green-200">
                                        <p className="text-xs text-green-700 text-center font-medium">
                                            ✓ Calculation complete! Results include {wastePercentage}% waste allowance.
                                        </p>
                                    </div>
                                ) : (
                                    <div className="bg-gradient-to-r from-red-50 to-orange-50 rounded-lg p-4 border border-orange-200">
                                        <p className="text-xs text-gray-600 text-center">
                                            Fill in the details to calculate the required tiles for your space
                                        </p>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                </div>

                {/* Informational Content Section */}
                <div className="mt-16 space-y-12">
                    {/* Why Use This Calculator */}
                    <div className="bg-white rounded-2xl shadow-lg p-8 md:p-12">
                        <h2 className="text-3xl font-bold bg-gradient-to-r from-red-600 to-orange-500 bg-clip-text text-transparent mb-6">
                            Why Use Our Tile Calculator?
                        </h2>
                        <div className="grid md:grid-cols-2 gap-8">
                            <div>
                                <h3 className="text-xl font-semibold text-slate-800 mb-4 flex items-center gap-2">
                                    <span className="w-8 h-8 bg-gradient-to-r from-red-500 to-orange-500 rounded-full flex items-center justify-center text-white text-sm">1</span>
                                    Save Money
                                </h3>
                                <p className="text-gray-600 leading-relaxed">
                                    Avoid over-ordering or under-ordering tiles. Our calculator helps you determine the exact quantity needed, preventing wastage and saving you money on your tiling project.
                                </p>
                            </div>
                            <div>
                                <h3 className="text-xl font-semibold text-slate-800 mb-4 flex items-center gap-2">
                                    <span className="w-8 h-8 bg-gradient-to-r from-red-500 to-orange-500 rounded-full flex items-center justify-center text-white text-sm">2</span>
                                    Save Time
                                </h3>
                                <p className="text-gray-600 leading-relaxed">
                                    No more manual calculations or guesswork. Get instant, accurate results in seconds. Plan your project efficiently and avoid multiple trips to the store.
                                </p>
                            </div>
                            <div>
                                <h3 className="text-xl font-semibold text-slate-800 mb-4 flex items-center gap-2">
                                    <span className="w-8 h-8 bg-gradient-to-r from-red-500 to-orange-500 rounded-full flex items-center justify-center text-white text-sm">3</span>
                                    Professional Accuracy
                                </h3>
                                <p className="text-gray-600 leading-relaxed">
                                    Our calculator accounts for waste, grout spacing, and cutting requirements, giving you professional-grade estimates that contractors rely on.
                                </p>
                            </div>
                            <div>
                                <h3 className="text-xl font-semibold text-slate-800 mb-4 flex items-center gap-2">
                                    <span className="w-8 h-8 bg-gradient-to-r from-red-500 to-orange-500 rounded-full flex items-center justify-center text-white text-sm">4</span>
                                    Plan with Confidence
                                </h3>
                                <p className="text-gray-600 leading-relaxed">
                                    Whether you're a DIY enthusiast or a professional contractor, make informed decisions about your tile purchase with accurate measurements and estimates.
                                </p>
                            </div>
                        </div>
                    </div>

                    {/* How to Use */}
                    <div className="bg-gradient-to-br from-slate-800 to-slate-900 rounded-2xl shadow-lg p-8 md:p-12 text-white">
                        <h2 className="text-3xl font-bold mb-2">
                            How to Use the Tile Calculator
                        </h2>
                        <p className="text-slate-300 mb-8">Follow these simple steps to get accurate tile estimates</p>

                        <div className="space-y-6">
                            <div className="flex gap-4">
                                <div className="flex-shrink-0">
                                    <div className="w-10 h-10 bg-gradient-to-r from-red-500 to-orange-500 rounded-full flex items-center justify-center font-bold">
                                        1
                                    </div>
                                </div>
                                <div>
                                    <h3 className="text-xl font-semibold mb-2">Select Room and Space Type</h3>
                                    <p className="text-slate-300 leading-relaxed">
                                        Choose the type of room (Bathroom, Kitchen, Living Room, etc.) and specify whether you're tiling the floor, wall, or both. This helps us provide more accurate recommendations.
                                    </p>
                                </div>
                            </div>

                            <div className="flex gap-4">
                                <div className="flex-shrink-0">
                                    <div className="w-10 h-10 bg-gradient-to-r from-red-500 to-orange-500 rounded-full flex items-center justify-center font-bold">
                                        2
                                    </div>
                                </div>
                                <div>
                                    <h3 className="text-xl font-semibold mb-2">Enter Area Dimensions</h3>
                                    <p className="text-slate-300 leading-relaxed">
                                        You can either enter the dimensions (length and width) of each wall/floor or input the total area directly. For complex spaces, add multiple walls using the "Add More" button to get precise calculations.
                                    </p>
                                </div>
                            </div>

                            <div className="flex gap-4">
                                <div className="flex-shrink-0">
                                    <div className="w-10 h-10 bg-gradient-to-r from-red-500 to-orange-500 rounded-full flex items-center justify-center font-bold">
                                        3
                                    </div>
                                </div>
                                <div>
                                    <h3 className="text-xl font-semibold mb-2">Choose Your Tile Size</h3>
                                    <p className="text-slate-300 leading-relaxed">
                                        Select from standard tile sizes (12"x12", 24"x24", etc.) or choose "Custom Size" to enter your specific tile dimensions. The calculator will automatically adjust the quantity based on your selection.
                                    </p>
                                </div>
                            </div>

                            <div className="flex gap-4">
                                <div className="flex-shrink-0">
                                    <div className="w-10 h-10 bg-gradient-to-r from-red-500 to-orange-500 rounded-full flex items-center justify-center font-bold">
                                        4
                                    </div>
                                </div>
                                <div>
                                    <h3 className="text-xl font-semibold mb-2">Add Waste and Grout Allowance</h3>
                                    <p className="text-slate-300 leading-relaxed">
                                        We recommend adding 10% waste for cutting and breakage. You can also specify grout width (typically 3mm) for more accurate spacing calculations. These options ensure you have enough tiles to complete your project.
                                    </p>
                                </div>
                            </div>

                            <div className="flex gap-4">
                                <div className="flex-shrink-0">
                                    <div className="w-10 h-10 bg-gradient-to-r from-red-500 to-orange-500 rounded-full flex items-center justify-center font-bold">
                                        5
                                    </div>
                                </div>
                                <div>
                                    <h3 className="text-xl font-semibold mb-2">Click Calculate</h3>
                                    <p className="text-slate-300 leading-relaxed">
                                        Hit the "Calculate" button to get instant results. The calculator will show you the total number of tiles needed and the total area in square feet. Use this information to make your purchase with confidence!
                                    </p>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Pro Tips */}
                    <div className="bg-gradient-to-r from-orange-50 to-red-50 rounded-2xl border-2 border-orange-200 p-8 md:p-12">
                        <h2 className="text-3xl font-bold bg-gradient-to-r from-red-600 to-orange-500 bg-clip-text text-transparent mb-6">
                            Pro Tips for Accurate Calculations
                        </h2>
                        <div className="grid md:grid-cols-2 gap-6">
                            <div className="flex gap-3">
                                <div className="flex-shrink-0 text-orange-500 text-xl">✓</div>
                                <div>
                                    <h4 className="font-semibold text-slate-800 mb-1">Measure Twice</h4>
                                    <p className="text-gray-600 text-sm">Always double-check your measurements before entering them into the calculator.</p>
                                </div>
                            </div>
                            <div className="flex gap-3">
                                <div className="flex-shrink-0 text-orange-500 text-xl">✓</div>
                                <div>
                                    <h4 className="font-semibold text-slate-800 mb-1">Account for Obstacles</h4>
                                    <p className="text-gray-600 text-sm">Subtract areas for fixtures, cabinets, or other permanent obstacles in your space.</p>
                                </div>
                            </div>
                            <div className="flex gap-3">
                                <div className="flex-shrink-0 text-orange-500 text-xl">✓</div>
                                <div>
                                    <h4 className="font-semibold text-slate-800 mb-1">Add Extra for Patterns</h4>
                                    <p className="text-gray-600 text-sm">If using patterned tiles or diagonal layouts, add an extra 15% waste instead of 10%.</p>
                                </div>
                            </div>
                            <div className="flex gap-3">
                                <div className="flex-shrink-0 text-orange-500 text-xl">✓</div>
                                <div>
                                    <h4 className="font-semibold text-slate-800 mb-1">Keep Extras</h4>
                                    <p className="text-gray-600 text-sm">Always keep a few extra tiles for future repairs or replacements.</p>
                                </div>
                            </div>
                            <div className="flex gap-3">
                                <div className="flex-shrink-0 text-orange-500 text-xl">✓</div>
                                <div>
                                    <h4 className="font-semibold text-slate-800 mb-1">Check Batch Numbers</h4>
                                    <p className="text-gray-600 text-sm">Ensure all tiles are from the same batch to avoid color variations.</p>
                                </div>
                            </div>
                            <div className="flex gap-3">
                                <div className="flex-shrink-0 text-orange-500 text-xl">✓</div>
                                <div>
                                    <h4 className="font-semibold text-slate-800 mb-1">Consult Professionals</h4>
                                    <p className="text-gray-600 text-sm">For complex layouts or large projects, consider consulting with our experts.</p>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Call to Action */}
                    <div className="bg-gradient-to-r from-red-600 to-orange-500 rounded-2xl shadow-xl p-8 md:p-12 text-center text-white">
                        <h2 className="text-3xl font-bold mb-4">Ready to Start Your Tiling Project?</h2>
                        <p className="text-lg mb-8 text-white/90 max-w-2xl mx-auto">
                            Browse our extensive collection of premium tiles and find the perfect match for your space. Our experts are here to help you every step of the way.
                        </p>
                        <div className="flex flex-wrap gap-4 justify-center">
                            <a
                                href="/search"
                                className="px-8 py-4 bg-white text-orange-600 font-semibold rounded-lg hover:bg-gray-100 transition-all shadow-lg"
                            >
                                Browse Tiles
                            </a>
                            <a
                                href="tel:+919738522119"
                                className="px-8 py-4 bg-transparent border-2 border-white text-white font-semibold rounded-lg hover:bg-white/10 transition-all"
                            >
                                Call Us: 097385 22119
                            </a>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
