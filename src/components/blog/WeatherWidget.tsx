import { useState, useEffect } from 'react';
import { Cloud, Sun, CloudRain, CloudSnow, Wind, Droplets, MapPin, Loader2, CloudLightning } from 'lucide-react';

interface WeatherData {
  temperature: number;
  humidity: number;
  windSpeed: number;
  weatherCode: number;
  location: string;
}

const weatherIcons: Record<number, { icon: React.ReactNode; label: string }> = {
  0: { icon: <Sun className="h-4 w-4 text-yellow-500" />, label: 'Clear' },
  1: { icon: <Sun className="h-4 w-4 text-yellow-400" />, label: 'Clear' },
  2: { icon: <Cloud className="h-4 w-4 text-gray-400" />, label: 'Cloudy' },
  3: { icon: <Cloud className="h-4 w-4 text-gray-500" />, label: 'Overcast' },
  45: { icon: <Cloud className="h-4 w-4 text-gray-400" />, label: 'Foggy' },
  48: { icon: <Cloud className="h-4 w-4 text-gray-400" />, label: 'Fog' },
  51: { icon: <CloudRain className="h-4 w-4 text-blue-400" />, label: 'Drizzle' },
  53: { icon: <CloudRain className="h-4 w-4 text-blue-500" />, label: 'Drizzle' },
  55: { icon: <CloudRain className="h-4 w-4 text-blue-600" />, label: 'Drizzle' },
  61: { icon: <CloudRain className="h-4 w-4 text-blue-400" />, label: 'Rain' },
  63: { icon: <CloudRain className="h-4 w-4 text-blue-500" />, label: 'Rain' },
  65: { icon: <CloudRain className="h-4 w-4 text-blue-600" />, label: 'Heavy rain' },
  71: { icon: <CloudSnow className="h-4 w-4 text-cyan-400" />, label: 'Snow' },
  73: { icon: <CloudSnow className="h-4 w-4 text-cyan-500" />, label: 'Snow' },
  75: { icon: <CloudSnow className="h-4 w-4 text-cyan-600" />, label: 'Heavy snow' },
  80: { icon: <CloudRain className="h-4 w-4 text-blue-500" />, label: 'Showers' },
  81: { icon: <CloudRain className="h-4 w-4 text-blue-600" />, label: 'Showers' },
  82: { icon: <CloudRain className="h-4 w-4 text-blue-700" />, label: 'Storms' },
  95: { icon: <CloudLightning className="h-4 w-4 text-purple-500" />, label: 'Thunder' },
  96: { icon: <CloudLightning className="h-4 w-4 text-purple-600" />, label: 'Thunder' },
  99: { icon: <CloudLightning className="h-4 w-4 text-purple-700" />, label: 'Storms' },
};

const getWeatherInfo = (code: number) => {
  return weatherIcons[code] || weatherIcons[0];
};

const WeatherWidget = () => {
  const [weather, setWeather] = useState<WeatherData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchWeather = async (lat: number, lon: number, locationName: string = 'Your Location') => {
      try {
        const response = await fetch(
          `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current=temperature_2m,relative_humidity_2m,weather_code,wind_speed_10m&timezone=auto`
        );
        
        if (!response.ok) throw new Error('Failed to fetch');
        
        const data = await response.json();
        
        setWeather({
          temperature: Math.round(data.current.temperature_2m),
          humidity: data.current.relative_humidity_2m,
          windSpeed: Math.round(data.current.wind_speed_10m),
          weatherCode: data.current.weather_code,
          location: locationName,
        });
      } catch (err) {
        console.error('Weather fetch error:', err);
      } finally {
        setLoading(false);
      }
    };

    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          fetchWeather(position.coords.latitude, position.coords.longitude);
        },
        () => {
          fetchWeather(14.5995, 120.9842, 'Manila');
        }
      );
    } else {
      fetchWeather(14.5995, 120.9842, 'Manila');
    }
  }, []);

  if (loading) {
    return (
      <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-gradient-to-r from-blue-500/10 to-cyan-500/10 border border-blue-500/20">
        <Loader2 className="h-4 w-4 animate-spin text-blue-500" />
        <span className="text-xs text-muted-foreground">Loading weather...</span>
      </div>
    );
  }

  if (!weather) return null;

  const weatherInfo = getWeatherInfo(weather.weatherCode);

  return (
    <div className="flex items-center gap-3 px-3 py-2 rounded-lg bg-gradient-to-r from-blue-500/10 to-cyan-500/10 border border-blue-500/20">
      <div className="flex items-center gap-1.5">
        {weatherInfo.icon}
        <span className="font-bold text-sm">{weather.temperature}°C</span>
      </div>
      <div className="hidden sm:flex items-center gap-3 text-xs text-muted-foreground border-l border-border pl-3">
        <span className="flex items-center gap-1">
          <MapPin className="h-3 w-3" />
          {weather.location}
        </span>
        <span className="flex items-center gap-1">
          <Droplets className="h-3 w-3 text-blue-400" />
          {weather.humidity}%
        </span>
        <span className="flex items-center gap-1">
          <Wind className="h-3 w-3" />
          {weather.windSpeed} km/h
        </span>
      </div>
      <span className="text-xs text-muted-foreground sm:hidden">{weatherInfo.label}</span>
    </div>
  );
};

export default WeatherWidget;
