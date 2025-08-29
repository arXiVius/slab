import React, { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

// This is the main application component.
// I've chosen a stark, high-contrast palette and a monospace font
// to deliver that raw, unfiltered brutalist feel. No gradients, no shadows.
const App = () => {
  // Helper to get state from localStorage
  const getLocalStorage = (key, defaultValue) => {
    try {
      const value = localStorage.getItem(key);
      if (value) {
        return JSON.parse(value);
      }
    } catch (error) {
      console.error("Error reading from localStorage:", error);
    }
    return defaultValue;
  };

  // Kanban board state, structured by column status.
  const [tasks, setTasks] = useState(() => getLocalStorage('tasks', {
    todo: [
      // The fix: I've replaced the hard-coded ID with a truly unique one.
      { id: crypto.randomUUID(), text: 'Plan next quarter goals', status: 'todo' },
      { id: crypto.randomUUID(), text: 'Review project proposal', status: 'todo' }
    ],
    inProgress: [],
    done: [],
  }));
  const [notes, setNotes] = useState(() => getLocalStorage('notes', ""));
  const [time, setTime] = useState(Date.now());
  const [timerActive, setTimerActive] = useState(false);
  const [timerSeconds, setTimerSeconds] = useState(() => getLocalStorage('timerSeconds', 25 * 60)); // 25 minutes for Pomodoro
  const [weatherData, setWeatherData] = useState(null);
  const [weatherLoading, setWeatherLoading] = useState(true);
  const [weatherError, setWeatherError] = useState(false);
  const [city, setCity] = useState(() => getLocalStorage('city', { name: 'Jakarta', lat: -6.2088, lon: 106.8456 }));
  const [citySearch, setCitySearch] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [draggedItem, setDraggedItem] = useState(null);
  const [dropTarget, setDropTarget] = useState(null);
  const [isDarkMode, setIsDarkMode] = useState(() => getLocalStorage('isDarkMode', false));
  const [isPaletteOpen, setIsPaletteOpen] = useState(false);
  const [isHeroEditModalOpen, setIsHeroEditModalOpen] = useState(false);
  const [heroTitle, setHeroTitle] = useState(() => getLocalStorage('heroTitle', 'slab.'));
  const [heroSubtitle, setHeroSubtitle] = useState(() => getLocalStorage('heroSubtitle', 'prodboard.'));

  // Static quotes to ensure reliability without an external API.
  const staticQuotes = [
    { content: "The best way to predict the future is to create it.", author: "Peter Drucker" },
    { content: "The secret of getting ahead is getting started.", author: "Mark Twain" },
    { content: "Don't watch the clock; do what it does. Keep going.", author: "Sam Levenson" },
    { content: "The only way to do great work is to love what you do.", author: "Steve Jobs" },
    { content: "Believe you can and you're halfway there.", author: "Theodore Roosevelt" },
    { content: "It does not matter how slowly you go as long as you do not stop.", author: "Confucius" },
    { content: "The future belongs to those who believe in the beauty of their dreams.", author: "Eleanor Roosevelt" },
  ];

  const [quote, setQuote] = useState(staticQuotes[Math.floor(Math.random() * staticQuotes.length)]);

  const timerIntervalRef = useRef(null);
  const searchTimeoutRef = useRef(null);
  const dragItemRef = useRef(null);
  const dragOverRef = useRef(null);
  const taskRefs = useRef({});

  // A simple mapping for WMO weather codes to descriptions and emojis.
  // This helps make the raw data more readable for the user.
  const weatherCodeMap = {
    0: { description: 'Clear sky', emoji: '☀️' },
    1: { description: 'Mainly clear', emoji: '🌤️' },
    2: { description: 'Partly cloudy', emoji: '⛅' },
    3: { description: 'Overcast', emoji: '☁️' },
    45: { description: 'Fog', emoji: '🌫️' },
    48: { description: 'Depositing rime fog', emoji: '🌫️' },
    51: { description: 'Light drizzle', emoji: '🌦️' },
    53: { description: 'Moderate drizzle', emoji: '🌧️' },
    55: { description: 'Dense drizzle', emoji: '🌧️' },
    61: { description: 'Slight rain', emoji: '🌧️' },
    63: { description: 'Moderate rain', emoji: '🌧️' },
    65: { description: 'Heavy rain', emoji: '🌧️' },
    80: { description: 'Slight rain showers', emoji: '🌦️' },
    81: { description: 'Moderate rain showers', emoji: '🌧️' },
    82: { description: 'Violent rain showers', emoji: '⛈️' },
    95: { description: 'Thunderstorm', emoji: '⚡' },
  };

  const fetchWeather = useCallback(async (lat, lon) => {
    try {
      setWeatherLoading(true);
      const response = await fetch(`https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current=temperature_2m,weather_code,wind_speed_10m,relative_humidity_2m&timezone=auto`);
      
      if (!response.ok) {
        throw new Error('Network response was not ok');
      }

      const data = await response.json();
      setWeatherData(data.current);
      setWeatherError(false);
    } catch (error) {
      console.error('Failed to fetch weather data:', error);
      setWeatherError(true);
    } finally {
      setWeatherLoading(false);
    }
  }, []);

  const toggleDarkMode = () => setIsDarkMode(prev => !prev);
  const getNewQuote = () => setQuote(staticQuotes[Math.floor(Math.random() * staticQuotes.length)]);
  const toggleTimer = () => setTimerActive(prev => !prev);
  const resetTimer = () => {
    setTimerSeconds(25 * 60);
    setTimerActive(false);
  };
  
  const handleHeroSave = (newTitle, newSubtitle) => {
    setHeroTitle(newTitle);
    setHeroSubtitle(newSubtitle);
    setIsHeroEditModalOpen(false);
  };

  // Command Palette Logic
  const commandActions = {
    'toggle theme': toggleDarkMode,
    'get new quote': getNewQuote,
    'start timer': () => setTimerActive(true),
    'pause timer': () => setTimerActive(false),
    'reset timer': resetTimer,
  };
  const commandList = Object.keys(commandActions);
  const [commandInput, setCommandInput] = useState('');
  const [filteredCommands, setFilteredCommands] = useState(commandList);

  const handleCommandInput = (e) => {
    const value = e.target.value.toLowerCase();
    setCommandInput(value);
    setFilteredCommands(
      commandList.filter(cmd => cmd.includes(value))
    );
  };

  const executeCommand = (command) => {
    const action = commandActions[command];
    if (action) {
      action();
      setIsPaletteOpen(false);
      setCommandInput('');
      setFilteredCommands(commandList);
    }
  };

  useEffect(() => {
    // Keyboard shortcut for command palette
    const handleKeyDown = (e) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
        e.preventDefault();
        setIsPaletteOpen(prev => !prev);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, []);

  // Save state to localStorage on changes
  useEffect(() => {
    localStorage.setItem('tasks', JSON.stringify(tasks));
  }, [tasks]);

  useEffect(() => {
    localStorage.setItem('notes', JSON.stringify(notes));
  }, [notes]);

  useEffect(() => {
    localStorage.setItem('timerSeconds', JSON.stringify(timerSeconds));
  }, [timerSeconds]);

  useEffect(() => {
    localStorage.setItem('isDarkMode', JSON.stringify(isDarkMode));
  }, [isDarkMode]);
  
  useEffect(() => {
    localStorage.setItem('heroTitle', JSON.stringify(heroTitle));
  }, [heroTitle]);

  useEffect(() => {
    localStorage.setItem('heroSubtitle', JSON.stringify(heroSubtitle));
  }, [heroSubtitle]);

  useEffect(() => {
    localStorage.setItem('city', JSON.stringify(city));
    // Fetch new weather data when city changes
    fetchWeather(city.lat, city.lon);
  }, [city, fetchWeather]);

  useEffect(() => {
    // Clock update
    const clockInterval = setInterval(() => setTime(Date.now()), 1000);

    // Initial data fetching
    fetchWeather(city.lat, city.lon);

    return () => {
      clearInterval(clockInterval);
      if (timerIntervalRef.current) {
        clearInterval(timerIntervalRef.current);
      }
    };
  }, [fetchWeather, city.lat, city.lon]);

  useEffect(() => {
    if (timerActive) {
      timerIntervalRef.current = setInterval(() => {
        setTimerSeconds(prevSeconds => {
          if (prevSeconds <= 1) {
            setTimerActive(false);
            return 25 * 60; // Reset
          }
          return prevSeconds - 1;
        });
      }, 1000);
    } else if (!timerActive && timerSeconds !== 25 * 60) {
      clearInterval(timerIntervalRef.current);
    }
    return () => clearInterval(timerIntervalRef.current);
  }, [timerActive, timerSeconds]);

  const handleCitySearch = async (event) => {
    event.preventDefault();
    if (citySearch.trim() === '') {
      setSearchResults([]);
      return;
    }
    clearTimeout(searchTimeoutRef.current);
    searchTimeoutRef.current = setTimeout(async () => {
      try {
        const response = await fetch(`https://geocoding-api.open-meteo.com/v1/search?name=${citySearch}&count=10&language=en&format=json`);
        const data = await response.json();
        setSearchResults(data.results || []);
      } catch (error) {
      console.error('Geocoding search failed:', error);
        setSearchResults([]);
      }
    }, 500); // Debounce the search
  };

  const handleCitySelect = (selectedCity) => {
    setCity({
      name: selectedCity.name,
      lat: selectedCity.latitude,
      lon: selectedCity.longitude,
    });
    setSearchResults([]);
    setCitySearch('');
  };

  const addTask = (event, status) => {
    event.preventDefault();
    const input = event.target.elements.taskInput;
    if (input.value.trim() !== "") {
      const newTask = {
        id: crypto.randomUUID(),
        text: input.value,
        status: status,
      };
      setTasks(prevTasks => ({
        ...prevTasks,
        [status]: [...prevTasks[status], newTask],
      }));
      input.value = "";
    }
  };

  const deleteTask = (id, status) => {
    setTasks(prevTasks => ({
      ...prevTasks,
      [status]: prevTasks[status].filter(task => task.id !== id),
    }));
  };

  // --- Drag and Drop (Desktop) ---
  const handleDragStart = (e, task) => {
    setDraggedItem(task);
    e.dataTransfer.setData("taskId", task.id);
  };

  const handleDragOver = (e, status) => {
    e.preventDefault();
    setDropTarget(status);
  };

  const handleDragLeave = (e) => {
    e.preventDefault();
    setDropTarget(null);
  };

  const handleDrop = (e, status) => {
    e.preventDefault();
    if (!draggedItem) {
      setDropTarget(null);
      return;
    }
  
    setTasks(prevTasks => {
      const sourceStatus = draggedItem.status;
      
      // Fix for the duplicate key issue: Ensure a clean removal before adding.
      const newTasks = { ...prevTasks };
      
      // Remove the item from its original list
      newTasks[sourceStatus] = newTasks[sourceStatus].filter(task => task.id !== draggedItem.id);
      
      // Add the item to its new list
      const updatedItem = { ...draggedItem, status: status };
      newTasks[status] = [...newTasks[status], updatedItem];
      
      return newTasks;
    });

    setDraggedItem(null);
    setDropTarget(null);
  };

  // --- Touch Drag and Drop (Mobile) ---
  const handleTouchStart = (e, task) => {
    // This is the key fix. By preventing the default browser behavior,
    // we stop the site from scrolling when you start a drag gesture.
    e.preventDefault();
    setDraggedItem(task);
    // Store initial touch position to track movement
    const touch = e.touches[0];
    dragItemRef.current = {
      x: touch.clientX,
      y: touch.clientY,
      task: task,
      element: e.currentTarget,
    };
    e.currentTarget.style.transition = 'none';
  };

  const handleTouchMove = (e) => {
    e.preventDefault();
    if (!draggedItem || !dragItemRef.current) return;
    const touch = e.touches[0];
    const dx = touch.clientX - dragItemRef.current.x;
    const dy = touch.clientY - dragItemRef.current.y;
    
    // Visually move the task element
    dragItemRef.current.element.style.transform = `translate(${dx}px, ${dy}px) rotate(2deg) scale(1.05)`;
    dragItemRef.current.element.style.zIndex = '100';

    // Highlight the drop zone
    const targetElement = document.elementFromPoint(touch.clientX, touch.clientY);
    const kanbanColumn = targetElement?.closest('.kanban-column');
    if (kanbanColumn) {
      const status = kanbanColumn.getAttribute('data-status');
      setDropTarget(status);
    } else {
      setDropTarget(null);
    }
  };

  const handleTouchEnd = (e) => {
    if (!draggedItem || !dragItemRef.current) return;

    // Reset visual styles
    dragItemRef.current.element.style.transform = '';
    dragItemRef.current.element.style.zIndex = '';
    dragItemRef.current.element.style.transition = '';

    if (dropTarget) {
      handleDrop(e, dropTarget);
    }

    setDraggedItem(null);
    setDropTarget(null);
    dragItemRef.current = null;
  };

  const formatTime = (seconds) => {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${String(minutes).padStart(2, '0')}:${String(remainingSeconds).padStart(2, '0')}`;
  };

  // Dynamically apply classes for dark mode
  const bgClass = isDarkMode ? 'bg-black' : 'bg-white';
  const textClass = isDarkMode ? 'text-white' : 'text-black';
  const borderClass = isDarkMode ? 'border-white' : 'border-black';

  return (
    <div className={`${bgClass} ${textClass} min-h-screen font-mono p-4 overflow-auto custom-selection`}>
      <style>{`
        .custom-selection::selection {
          background-color: #EF4444; /* red-600 */
          color: white;
        }
        .custom-selection::-moz-selection {
          background-color: #EF4444; /* red-600 */
          color: white;
        }
      `}</style>
      <div className="container mx-auto max-w-7xl">
        <header className={`border-4 p-4 mb-4 ${borderClass}`}>
          <div className="flex justify-between items-center">
            <div className="flex flex-col">
              <h1 className="text-4xl font-extrabold uppercase">
                {heroTitle} <span className="text-red-600">{heroSubtitle}</span>
              </h1>
              <button
                onClick={() => setIsHeroEditModalOpen(true)}
                className={`text-xs mt-1 self-start font-bold py-1 px-2 ${borderClass} ${isDarkMode ? 'hover:bg-red-600' : 'hover:bg-red-600 hover:text-white'}`}
              >
                EDIT HERO
              </button>
            </div>
            <button
              onClick={toggleDarkMode}
              className={`border-2 font-bold py-1 px-3 ${borderClass} ${textClass} transition-colors ${isDarkMode ? 'hover:bg-white hover:text-black' : 'hover:bg-black hover:text-white'}`}
            >
              TOGGLE THEME
            </button>
          </div>
          <p className={`text-sm border-t-2 mt-2 pt-2 ${borderClass}`}>
            STATUS: <span className="text-red-600 font-bold">ONLINE</span>
          </p>
        </header>

        <main className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          
          <motion.section 
            initial={{ opacity: 0, y: 50 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.1 }}
            className={`border-4 p-4 col-span-1 md:col-span-3 lg:col-span-2 ${borderClass} ${isDarkMode ? 'bg-black' : 'bg-white'}`}
          >
            <h2 className={`text-2xl font-bold uppercase mb-4 border-b-2 border-dashed pb-2 ${borderClass}`}>
              Project Board
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {['todo', 'inProgress', 'done'].map(status => (
                <motion.div
                  key={status}
                  data-status={status}
                  className={`kanban-column border-2 p-2 min-h-64 ${borderClass} ${dropTarget === status ? (isDarkMode ? 'bg-gray-800' : 'bg-yellow-200') : (isDarkMode ? 'bg-gray-900' : 'bg-gray-100')}`}
                  // Desktop drag-and-drop
                  onDragOver={(e) => handleDragOver(e, status)}
                  onDragLeave={handleDragLeave}
                  onDrop={(e) => handleDrop(e, status)}
                  // Mobile touch-and-drop
                  onTouchMove={handleTouchMove}
                  onTouchEnd={handleTouchEnd}
                >
                  <h3 className={`text-xl font-bold uppercase mb-2 ${dropTarget === status ? 'text-red-600' : ''}`}>
                    {status.replace(/([A-Z])/g, ' $1').toUpperCase()}
                  </h3>
                  <form onSubmit={(e) => addTask(e, status)} className="flex flex-col mb-4">
                    <input 
                      type="text" 
                      name="taskInput" 
                      placeholder="ADD TASK..."
                      className={`flex-grow border-2 p-1 focus:outline-none focus:border-red-600 mb-2 ${isDarkMode ? 'bg-black text-white border-white placeholder:text-gray-400' : 'bg-white text-black border-black placeholder:text-black'}`}
                    />
                    <button type="submit" className={`border-2 border-red-600 text-white font-bold py-2 transition-colors text-sm w-full ${isDarkMode ? 'bg-red-600 hover:bg-black hover:text-red-600' : 'bg-red-600 hover:bg-black hover:text-red-600'}`}>
                      ADD TASK
                    </button>
                  </form>
                  <ul className="space-y-2">
                    <AnimatePresence>
                      {tasks[status].map(task => (
                        <motion.li
                          key={task.id}
                          draggable
                          // Desktop events
                          onDragStart={(e) => handleDragStart(e, task)}
                          // Mobile events
                          onTouchStart={(e) => handleTouchStart(e, task)}
                          initial={{ opacity: 0, scale: 0.95 }}
                          animate={{ opacity: 1, scale: 1 }}
                          exit={{ opacity: 0, scale: 0.95 }}
                          transition={{ duration: 0.3 }}
                          className={`touch-action-none flex items-center space-x-2 border-2 p-2 cursor-grab active:cursor-grabbing ${isDarkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-black'} ${task.status === 'done' ? (isDarkMode ? 'bg-lime-800' : 'bg-lime-200') : ''}`}
                        >
                          <span className={`flex-grow ${task.status === 'done' ? (isDarkMode ? 'line-through text-gray-400' : 'line-through text-gray-500') : ''}`}>
                            {task.text}
                          </span>
                          <button 
                            onClick={() => deleteTask(task.id, task.status)}
                            className="text-red-600 font-bold hover:text-black transition-colors"
                          >
                            [X]
                          </button>
                        </motion.li>
                      ))}
                    </AnimatePresence>
                  </ul>
                </motion.div>
              ))}
            </div>
          </motion.section>

          <motion.section 
            initial={{ opacity: 0, y: 50 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.2 }}
            className={`border-4 p-4 ${borderClass} ${isDarkMode ? 'bg-gray-900' : 'bg-yellow-200'}`}
          >
            <h2 className={`text-2xl font-bold uppercase mb-4 border-b-2 border-dashed pb-2 ${borderClass}`}>
              Notes
            </h2>
            <textarea
              className={`w-full h-48 border-2 p-2 focus:outline-none focus:border-red-600 ${isDarkMode ? 'bg-black text-white border-white placeholder:text-gray-400' : 'bg-white text-black border-black placeholder:text-black'}`}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="ENTER NOTES HERE..."
            ></textarea>
          </motion.section>

          <motion.section 
            initial={{ opacity: 0, y: 50 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.3 }}
            className={`border-4 p-4 flex flex-col items-center justify-center text-center ${borderClass} ${isDarkMode ? 'bg-black' : 'bg-white'}`}
          >
            <h2 className={`text-2xl font-bold uppercase mb-4 border-b-2 border-dashed pb-2 w-full ${borderClass}`}>
              Pomodoro Timer
            </h2>
            <div className="text-6xl font-extrabold my-8 text-red-600">
              {formatTime(timerSeconds)}
            </div>
            <div className="flex space-x-4">
              <button 
                onClick={() => setTimerActive(true)}
                className={`border-2 border-red-600 font-bold py-2 px-4 transition-colors ${isDarkMode ? 'bg-red-600 text-white hover:bg-white hover:text-red-600' : 'bg-red-600 text-white hover:bg-black hover:text-red-600'}`}
              >
                START
              </button>
              <button 
                onClick={() => setTimerActive(false)}
                className={`border-2 border-red-600 font-bold py-2 px-4 transition-colors ${isDarkMode ? 'bg-red-600 text-white hover:bg-white hover:text-red-600' : 'bg-red-600 hover:bg-black text-white hover:text-red-600'}`}
              >
                PAUSE
              </button>
              <button 
                onClick={() => { setTimerSeconds(25 * 60); setTimerActive(false); }}
                className={`border-2 border-red-600 font-bold py-2 px-4 transition-colors ${isDarkMode ? 'bg-red-600 text-white hover:bg-white hover:text-red-600' : 'bg-red-600 hover:bg-black text-white hover:text-red-600'}`}
              >
                RESET
              </button>
            </div>
          </motion.section>

          <motion.section 
            initial={{ opacity: 0, y: 50 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.4 }}
            className={`border-4 p-4 col-span-1 md:col-span-2 lg:col-span-1 relative ${borderClass} ${isDarkMode ? 'bg-black' : 'bg-white'}`}
          >
            <h2 className={`text-2xl font-bold uppercase mb-4 border-b-2 border-dashed pb-2 ${borderClass}`}>
              Current Weather
            </h2>
            <form onSubmit={handleCitySearch} className="flex mb-2">
              <input
                type="text"
                value={citySearch}
                onChange={(e) => setCitySearch(e.target.value)}
                placeholder="SEARCH CITY..."
                className={`flex-grow border-2 p-2 focus:outline-none focus:border-red-600 ${isDarkMode ? 'bg-black text-white border-white placeholder:text-gray-400' : 'bg-white text-black border-black placeholder:text-black'}`}
              />
              <button type="submit" className={`border-2 border-red-600 text-white font-bold p-2 ml-2 transition-colors ${isDarkMode ? 'bg-red-600 hover:bg-black hover:text-red-600' : 'bg-red-600 hover:bg-black hover:text-red-600'}`}>
                GO
              </button>
            </form>
            <AnimatePresence>
              {searchResults.length > 0 && (
                <motion.ul
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  transition={{ duration: 0.2 }}
                  className={`absolute top-full left-0 right-0 z-10 border-4 border-t-0 max-h-40 overflow-y-auto ${borderClass} ${isDarkMode ? 'bg-black' : 'bg-white'}`}
                >
                  {searchResults.map((result) => (
                    <li
                      key={`${result.latitude}-${result.longitude}`}
                      onClick={() => handleCitySelect(result)}
                      className={`p-2 border-b-2 cursor-pointer transition-colors ${isDarkMode ? 'border-gray-800 hover:bg-gray-900' : 'border-gray-200 hover:bg-yellow-200'}`}
                    >
                      {result.name}, {result.country_code}
                    </li>
                  ))}
                </motion.ul>
              )}
            </AnimatePresence>
            {weatherLoading ? (
              <p className="text-xl">Fetching weather data...</p>
            ) : weatherError ? (
              <p className="text-xl text-red-600">Error: Could not retrieve data.</p>
            ) : weatherData ? (
              <div className="flex items-center space-x-4 text-xl">
                <span className="text-red-600 text-5xl">
                  {weatherCodeMap[weatherData.weather_code]?.emoji || '❓'}
                </span>
                <div className="flex flex-col space-y-1">
                  <p className="text-2xl font-bold">{weatherData.temperature_2m}°C</p>
                  <p>{weatherCodeMap[weatherData.weather_code]?.description || 'Unknown'}</p>
                  <p>Humidity: {weatherData.relative_humidity_2m}%</p>
                  <p>Wind: {weatherData.wind_speed_10m} km/h</p>
                </div>
              </div>
            ) : (
                <p>No weather data available.</p>
            )}
          </motion.section>

          <motion.section 
            initial={{ opacity: 0, y: 50 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.5 }}
            className={`border-4 p-4 col-span-1 md:col-span-2 lg:col-span-1 ${borderClass} ${isDarkMode ? 'bg-black' : 'bg-white'}`}
          >
            <div className={`flex justify-between items-center mb-4 border-b-2 border-dashed pb-2 ${borderClass}`}>
              <h2 className="text-2xl font-bold uppercase">Quote</h2>
              <button 
                onClick={getNewQuote}
                className="text-sm font-bold text-red-600 hover:text-red-500 transition-colors"
              >
                [REFRESH]
              </button>
            </div>
            
            <AnimatePresence mode="wait">
              <motion.blockquote
                key={quote.content}
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 10 }}
                transition={{ duration: 0.5 }}
                className={`italic border-l-4 pl-4 ${borderClass}`}
              >
                {quote.content || 'Awaiting a new quote...'}
              </motion.blockquote>
            </AnimatePresence>
            <cite className="block text-right mt-2 text-sm">
              - {quote.author || 'Unknown'}
            </cite>
          </motion.section>

          <motion.section 
            initial={{ opacity: 0, y: 50 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.6 }}
            className="border-4 border-black p-4 bg-red-600 text-white col-span-1 lg:col-span-1"
          >
            <h2 className="text-2xl font-bold uppercase mb-4 border-b-2 border-dashed border-white pb-2">
              System Time
            </h2>
            <div className="text-4xl font-extrabold uppercase">
              {new Date(time).toLocaleTimeString()}
            </div>
            <div className="text-lg">
              {new Date(time).toLocaleDateString()}
            </div>
          </motion.section>
        </main>
        
        <AnimatePresence>
          {isPaletteOpen && (
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              transition={{ duration: 0.2 }}
              className="fixed inset-0 z-50 flex items-start justify-center p-4 bg-black bg-opacity-50 backdrop-blur-sm"
              onClick={() => setIsPaletteOpen(false)}
            >
              <div className={`w-full max-w-xl p-2 border-4 ${borderClass} ${bgClass} ${textClass}`} onClick={e => e.stopPropagation()}>
                <input
                  type="text"
                  placeholder="Type a command..."
                  value={commandInput}
                  onChange={handleCommandInput}
                  className={`w-full text-xl p-2 border-2 focus:outline-none mb-2 ${isDarkMode ? 'bg-black text-white border-white' : 'bg-white text-black border-black'}`}
                />
                <ul className="max-h-64 overflow-y-auto">
                  <AnimatePresence>
                    {filteredCommands.map(command => (
                      <motion.li
                        key={command}
                        initial={{ opacity: 0, y: -5 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -5 }}
                        transition={{ duration: 0.1 }}
                        onClick={() => executeCommand(command)}
                        className={`p-2 cursor-pointer border-b-2 transition-colors ${isDarkMode ? 'border-gray-800 hover:bg-red-600 hover:text-white' : 'border-gray-200 hover:bg-red-600 hover:text-white'}`}
                      >
                        {command}
                      </motion.li>
                    ))}
                  </AnimatePresence>
                </ul>
              </div>
            </motion.div>
          )}

          {isHeroEditModalOpen && (
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              transition={{ duration: 0.2 }}
              className="fixed inset-0 z-50 flex items-start justify-center p-4 bg-black bg-opacity-50 backdrop-blur-sm"
              onClick={() => setIsHeroEditModalOpen(false)}
            >
              <div className={`w-full max-w-xl p-4 border-4 ${borderClass} ${bgClass} ${textClass}`} onClick={e => e.stopPropagation()}>
                <h3 className={`text-xl font-bold uppercase mb-4 border-b-2 border-dashed pb-2 ${borderClass}`}>
                  EDIT HERO TEXT
                </h3>
                <form
                  onSubmit={(e) => {
                    e.preventDefault();
                    handleHeroSave(e.target.title.value, e.target.subtitle.value);
                  }}
                  className="flex flex-col space-y-4"
                >
                  <div>
                    <label className="block text-sm uppercase mb-1">Title</label>
                    <input
                      type="text"
                      name="title"
                      defaultValue={heroTitle}
                      className={`w-full text-lg p-2 border-2 focus:outline-none focus:border-red-600 ${isDarkMode ? 'bg-black text-white border-white' : 'bg-white text-black border-black'}`}
                    />
                  </div>
                  <div>
                    <label className="block text-sm uppercase mb-1">Subtitle</label>
                    <input
                      type="text"
                      name="subtitle"
                      defaultValue={heroSubtitle}
                      className={`w-full text-lg p-2 border-2 focus:outline-none focus:border-red-600 ${isDarkMode ? 'bg-black text-white border-white' : 'bg-white text-black border-black'}`}
                    />
                  </div>
                  <div className="flex justify-end space-x-2">
                    <button
                      type="button"
                      onClick={() => setIsHeroEditModalOpen(false)}
                      className={`border-2 font-bold py-2 px-4 transition-colors ${isDarkMode ? 'border-white hover:bg-red-600 hover:text-white' : 'border-black hover:bg-black hover:text-white'}`}
                    >
                      CANCEL
                    </button>
                    <button
                      type="submit"
                      className={`border-2 border-red-600 text-white font-bold py-2 px-4 transition-colors ${isDarkMode ? 'bg-red-600 hover:bg-black hover:text-red-600' : 'bg-red-600 hover:bg-black hover:text-red-600'}`}
                    >
                      SAVE
                    </button>
                  </div>
                </form>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        <footer className="text-center text-sm opacity-70 mt-10">
          Made with ❤️ by <a href="https://github.com/arXiVius" target="_blank" className="underline hover:text-red-600">arXiVius</a>
        </footer>
      </div>
    </div>
  );
};

export default App;
