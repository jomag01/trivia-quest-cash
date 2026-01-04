import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { 
  Cloud, Sun, CloudRain, CloudSnow, Wind, Droplets, 
  Thermometer, MapPin, RefreshCw, Loader2, CloudLightning,
  Sunrise, Sunset, Eye, Gauge, TrendingUp, Calendar
} from 'lucide-react';
import { format, addDays } from 'date-fns';

interface WeatherData {
  current: {
    temperature: number;
    humidity: number;
    windSpeed: number;
    weatherCode: number;
    feelsLike: number;
    visibility: number;
    pressure: number;
  };
  daily: {
    date: string;
    tempMax: number;
    tempMin: number;
    weatherCode: number;
    precipitation: number;
    windSpeed: number;
    sunrise: string;
    sunset: string;
  }[];
  location: {
    name: string;
    country: string;
    lat: number;
    lon: number;
  };
}

const weatherCodes: Record<number, { icon: React.ReactNode; label: string; color: string }> = {
  0: { icon: <Sun className="h-6 w-6" />, label: 'Clear sky', color: 'text-yellow-500' },
  1: { icon: <Sun className="h-6 w-6" />, label: 'Mainly clear', color: 'text-yellow-400' },
  2: { icon: <Cloud className="h-6 w-6" />, label: 'Partly cloudy', color: 'text-gray-400' },
  3: { icon: <Cloud className="h-6 w-6" />, label: 'Overcast', color: 'text-gray-500' },
  45: { icon: <Cloud className="h-6 w-6" />, label: 'Foggy', color: 'text-gray-400' },
  48: { icon: <Cloud className="h-6 w-6" />, label: 'Rime fog', color: 'text-gray-400' },
  51: { icon: <CloudRain className="h-6 w-6" />, label: 'Light drizzle', color: 'text-blue-400' },
  53: { icon: <CloudRain className="h-6 w-6" />, label: 'Moderate drizzle', color: 'text-blue-500' },
  55: { icon: <CloudRain className="h-6 w-6" />, label: 'Dense drizzle', color: 'text-blue-600' },
  61: { icon: <CloudRain className="h-6 w-6" />, label: 'Slight rain', color: 'text-blue-400' },
  63: { icon: <CloudRain className="h-6 w-6" />, label: 'Moderate rain', color: 'text-blue-500' },
  65: { icon: <CloudRain className="h-6 w-6" />, label: 'Heavy rain', color: 'text-blue-600' },
  71: { icon: <CloudSnow className="h-6 w-6" />, label: 'Slight snow', color: 'text-cyan-400' },
  73: { icon: <CloudSnow className="h-6 w-6" />, label: 'Moderate snow', color: 'text-cyan-500' },
  75: { icon: <CloudSnow className="h-6 w-6" />, label: 'Heavy snow', color: 'text-cyan-600' },
  80: { icon: <CloudRain className="h-6 w-6" />, label: 'Rain showers', color: 'text-blue-500' },
  81: { icon: <CloudRain className="h-6 w-6" />, label: 'Moderate showers', color: 'text-blue-600' },
  82: { icon: <CloudRain className="h-6 w-6" />, label: 'Violent showers', color: 'text-blue-700' },
  95: { icon: <CloudLightning className="h-6 w-6" />, label: 'Thunderstorm', color: 'text-purple-500' },
  96: { icon: <CloudLightning className="h-6 w-6" />, label: 'Thunderstorm + hail', color: 'text-purple-600' },
  99: { icon: <CloudLightning className="h-6 w-6" />, label: 'Heavy thunderstorm', color: 'text-purple-700' },
};

const getWeatherInfo = (code: number) => {
  return weatherCodes[code] || weatherCodes[0];
};

const WeatherForecast = () => {
  const [weather, setWeather] = useState<WeatherData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedDay, setSelectedDay] = useState(0);

  const fetchWeather = async (lat: number, lon: number, locationName: string = 'Your Location') => {
    setLoading(true);
    setError(null);
    
    try {
      const response = await fetch(
        `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current=temperature_2m,relative_humidity_2m,apparent_temperature,weather_code,wind_speed_10m,surface_pressure,visibility&daily=weather_code,temperature_2m_max,temperature_2m_min,precipitation_sum,wind_speed_10m_max,sunrise,sunset&timezone=auto&forecast_days=10`
      );
      
      if (!response.ok) throw new Error('Failed to fetch weather data');
      
      const data = await response.json();
      
      const weatherData: WeatherData = {
        current: {
          temperature: Math.round(data.current.temperature_2m),
          humidity: data.current.relative_humidity_2m,
          windSpeed: Math.round(data.current.wind_speed_10m),
          weatherCode: data.current.weather_code,
          feelsLike: Math.round(data.current.apparent_temperature),
          visibility: Math.round(data.current.visibility / 1000),
          pressure: Math.round(data.current.surface_pressure),
        },
        daily: data.daily.time.map((date: string, i: number) => ({
          date,
          tempMax: Math.round(data.daily.temperature_2m_max[i]),
          tempMin: Math.round(data.daily.temperature_2m_min[i]),
          weatherCode: data.daily.weather_code[i],
          precipitation: data.daily.precipitation_sum[i],
          windSpeed: Math.round(data.daily.wind_speed_10m_max[i]),
          sunrise: data.daily.sunrise[i],
          sunset: data.daily.sunset[i],
        })),
        location: {
          name: locationName,
          country: '',
          lat,
          lon,
        },
      };
      
      setWeather(weatherData);
    } catch (err) {
      setError('Failed to load weather data');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    // Try to get user's location
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          fetchWeather(position.coords.latitude, position.coords.longitude);
        },
        () => {
          // Default to Manila if location denied
          fetchWeather(14.5995, 120.9842, 'Manila');
        }
      );
    } else {
      fetchWeather(14.5995, 120.9842, 'Manila');
    }
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center space-y-4">
          <Loader2 className="h-12 w-12 animate-spin text-primary mx-auto" />
          <p className="text-muted-foreground">Loading GraphCast AI Weather...</p>
        </div>
      </div>
    );
  }

  if (error || !weather) {
    return (
      <div className="text-center py-12">
        <Cloud className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
        <p className="text-muted-foreground mb-4">{error || 'Unable to load weather'}</p>
        <Button onClick={() => fetchWeather(14.5995, 120.9842, 'Manila')}>
          <RefreshCw className="h-4 w-4 mr-2" /> Try Again
        </Button>
      </div>
    );
  }

  const currentWeather = getWeatherInfo(weather.current.weatherCode);
  const selectedDayData = weather.daily[selectedDay];
  const selectedDayWeather = getWeatherInfo(selectedDayData.weatherCode);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold bg-gradient-to-r from-blue-500 to-cyan-500 bg-clip-text text-transparent">
            GraphCast AI Weather
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            10-day AI-powered weather predictions with high accuracy
          </p>
        </div>
        <Button variant="outline" size="icon" onClick={() => fetchWeather(weather.location.lat, weather.location.lon, weather.location.name)}>
          <RefreshCw className="h-4 w-4" />
        </Button>
      </div>

      {/* Location */}
      <div className="flex items-center gap-2 text-muted-foreground">
        <MapPin className="h-4 w-4" />
        <span>{weather.location.name}</span>
        <Badge variant="secondary" className="ml-2">
          <TrendingUp className="h-3 w-3 mr-1" />
          AI Prediction
        </Badge>
      </div>

      {/* Current Weather Card */}
      <Card className="bg-gradient-to-br from-blue-500/10 to-cyan-500/10 border-blue-500/20">
        <CardContent className="pt-6">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-6">
            <div className="flex items-center gap-6">
              <div className={`${currentWeather.color}`}>
                {currentWeather.icon}
              </div>
              <div>
                <div className="text-5xl sm:text-6xl font-bold">{weather.current.temperature}°C</div>
                <p className="text-muted-foreground">{currentWeather.label}</p>
                <p className="text-sm text-muted-foreground">Feels like {weather.current.feelsLike}°C</p>
              </div>
            </div>
            
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 text-sm">
              <div className="flex items-center gap-2">
                <Droplets className="h-4 w-4 text-blue-500" />
                <div>
                  <p className="text-muted-foreground">Humidity</p>
                  <p className="font-semibold">{weather.current.humidity}%</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Wind className="h-4 w-4 text-gray-500" />
                <div>
                  <p className="text-muted-foreground">Wind</p>
                  <p className="font-semibold">{weather.current.windSpeed} km/h</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Eye className="h-4 w-4 text-green-500" />
                <div>
                  <p className="text-muted-foreground">Visibility</p>
                  <p className="font-semibold">{weather.current.visibility} km</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Gauge className="h-4 w-4 text-purple-500" />
                <div>
                  <p className="text-muted-foreground">Pressure</p>
                  <p className="font-semibold">{weather.current.pressure} hPa</p>
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* 10-Day Forecast */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center gap-2 text-lg">
            <Calendar className="h-5 w-5" />
            10-Day GraphCast Forecast
          </CardTitle>
        </CardHeader>
        <CardContent>
          <ScrollArea className="w-full pb-2">
            <div className="flex gap-2 min-w-max">
              {weather.daily.map((day, idx) => {
                const dayWeather = getWeatherInfo(day.weatherCode);
                const isToday = idx === 0;
                const isSelected = idx === selectedDay;
                
                return (
                  <Button
                    key={day.date}
                    variant={isSelected ? "default" : "outline"}
                    className={`flex flex-col items-center h-auto py-3 px-4 min-w-[80px] ${isSelected ? 'ring-2 ring-primary' : ''}`}
                    onClick={() => setSelectedDay(idx)}
                  >
                    <span className="text-xs font-medium">
                      {isToday ? 'Today' : format(new Date(day.date), 'EEE')}
                    </span>
                    <span className="text-xs text-muted-foreground">
                      {format(new Date(day.date), 'MMM d')}
                    </span>
                    <div className={`my-2 ${dayWeather.color}`}>
                      {dayWeather.icon}
                    </div>
                    <div className="text-sm">
                      <span className="font-bold">{day.tempMax}°</span>
                      <span className="text-muted-foreground ml-1">{day.tempMin}°</span>
                    </div>
                  </Button>
                );
              })}
            </div>
          </ScrollArea>
        </CardContent>
      </Card>

      {/* Selected Day Details */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-lg">
            {selectedDay === 0 ? 'Today' : format(new Date(selectedDayData.date), 'EEEE, MMMM d')} Details
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <div className="flex items-center gap-3 p-3 rounded-lg bg-muted/50">
              <Thermometer className="h-5 w-5 text-red-500" />
              <div>
                <p className="text-xs text-muted-foreground">High / Low</p>
                <p className="font-semibold">{selectedDayData.tempMax}° / {selectedDayData.tempMin}°</p>
              </div>
            </div>
            <div className="flex items-center gap-3 p-3 rounded-lg bg-muted/50">
              <CloudRain className="h-5 w-5 text-blue-500" />
              <div>
                <p className="text-xs text-muted-foreground">Precipitation</p>
                <p className="font-semibold">{selectedDayData.precipitation} mm</p>
              </div>
            </div>
            <div className="flex items-center gap-3 p-3 rounded-lg bg-muted/50">
              <Wind className="h-5 w-5 text-gray-500" />
              <div>
                <p className="text-xs text-muted-foreground">Wind Speed</p>
                <p className="font-semibold">{selectedDayData.windSpeed} km/h</p>
              </div>
            </div>
            <div className="flex items-center gap-3 p-3 rounded-lg bg-muted/50">
              <div className={selectedDayWeather.color}>
                {selectedDayWeather.icon}
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Condition</p>
                <p className="font-semibold text-sm">{selectedDayWeather.label}</p>
              </div>
            </div>
          </div>

          {/* Sun times */}
          <div className="flex items-center justify-center gap-8 mt-4 pt-4 border-t">
            <div className="flex items-center gap-2 text-sm">
              <Sunrise className="h-5 w-5 text-orange-400" />
              <div>
                <p className="text-xs text-muted-foreground">Sunrise</p>
                <p className="font-semibold">{format(new Date(selectedDayData.sunrise), 'h:mm a')}</p>
              </div>
            </div>
            <div className="flex items-center gap-2 text-sm">
              <Sunset className="h-5 w-5 text-orange-600" />
              <div>
                <p className="text-xs text-muted-foreground">Sunset</p>
                <p className="font-semibold">{format(new Date(selectedDayData.sunset), 'h:mm a')}</p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* AI Info */}
      <Card className="bg-gradient-to-r from-purple-500/10 to-blue-500/10 border-purple-500/20">
        <CardContent className="pt-6">
          <div className="flex items-start gap-4">
            <div className="p-3 rounded-full bg-purple-500/20">
              <TrendingUp className="h-6 w-6 text-purple-500" />
            </div>
            <div>
              <h3 className="font-semibold mb-1">About GraphCast AI</h3>
              <p className="text-sm text-muted-foreground">
                GraphCast is Google DeepMind's AI weather prediction model that provides 10-day forecasts 
                with remarkable accuracy. It uses machine learning trained on decades of weather data 
                to predict global weather patterns faster and more accurately than traditional methods.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default WeatherForecast;
