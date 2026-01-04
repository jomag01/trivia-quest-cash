import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { 
  Cloud, Sun, CloudRain, CloudSnow, Wind, Droplets, 
  Thermometer, MapPin, RefreshCw, Loader2, CloudLightning,
  Sunrise, Sunset, Eye, Gauge, TrendingUp, Calendar,
  Share2, Facebook, Twitter, MessageCircle, Send, Copy, Check
} from 'lucide-react';
import { format, addDays } from 'date-fns';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { toast } from 'sonner';

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

const weatherCodes: Record<number, { icon: React.ReactNode; label: string; gradient: string; bgGradient: string }> = {
  0: { icon: <Sun className="h-8 w-8 sm:h-12 sm:w-12" />, label: 'Clear sky', gradient: 'from-yellow-400 to-orange-500', bgGradient: 'from-yellow-500/20 to-orange-500/20' },
  1: { icon: <Sun className="h-8 w-8 sm:h-12 sm:w-12" />, label: 'Mainly clear', gradient: 'from-yellow-300 to-amber-400', bgGradient: 'from-yellow-400/20 to-amber-400/20' },
  2: { icon: <Cloud className="h-8 w-8 sm:h-12 sm:w-12" />, label: 'Partly cloudy', gradient: 'from-gray-300 to-blue-300', bgGradient: 'from-gray-300/20 to-blue-300/20' },
  3: { icon: <Cloud className="h-8 w-8 sm:h-12 sm:w-12" />, label: 'Overcast', gradient: 'from-gray-400 to-slate-500', bgGradient: 'from-gray-400/20 to-slate-500/20' },
  45: { icon: <Cloud className="h-8 w-8 sm:h-12 sm:w-12" />, label: 'Foggy', gradient: 'from-gray-300 to-gray-400', bgGradient: 'from-gray-300/20 to-gray-400/20' },
  48: { icon: <Cloud className="h-8 w-8 sm:h-12 sm:w-12" />, label: 'Rime fog', gradient: 'from-gray-300 to-gray-400', bgGradient: 'from-gray-300/20 to-gray-400/20' },
  51: { icon: <CloudRain className="h-8 w-8 sm:h-12 sm:w-12" />, label: 'Light drizzle', gradient: 'from-blue-300 to-cyan-400', bgGradient: 'from-blue-300/20 to-cyan-400/20' },
  53: { icon: <CloudRain className="h-8 w-8 sm:h-12 sm:w-12" />, label: 'Moderate drizzle', gradient: 'from-blue-400 to-cyan-500', bgGradient: 'from-blue-400/20 to-cyan-500/20' },
  55: { icon: <CloudRain className="h-8 w-8 sm:h-12 sm:w-12" />, label: 'Dense drizzle', gradient: 'from-blue-500 to-cyan-600', bgGradient: 'from-blue-500/20 to-cyan-600/20' },
  61: { icon: <CloudRain className="h-8 w-8 sm:h-12 sm:w-12" />, label: 'Slight rain', gradient: 'from-blue-400 to-indigo-500', bgGradient: 'from-blue-400/20 to-indigo-500/20' },
  63: { icon: <CloudRain className="h-8 w-8 sm:h-12 sm:w-12" />, label: 'Moderate rain', gradient: 'from-blue-500 to-indigo-600', bgGradient: 'from-blue-500/20 to-indigo-600/20' },
  65: { icon: <CloudRain className="h-8 w-8 sm:h-12 sm:w-12" />, label: 'Heavy rain', gradient: 'from-blue-600 to-indigo-700', bgGradient: 'from-blue-600/20 to-indigo-700/20' },
  71: { icon: <CloudSnow className="h-8 w-8 sm:h-12 sm:w-12" />, label: 'Slight snow', gradient: 'from-cyan-300 to-blue-300', bgGradient: 'from-cyan-300/20 to-blue-300/20' },
  73: { icon: <CloudSnow className="h-8 w-8 sm:h-12 sm:w-12" />, label: 'Moderate snow', gradient: 'from-cyan-400 to-blue-400', bgGradient: 'from-cyan-400/20 to-blue-400/20' },
  75: { icon: <CloudSnow className="h-8 w-8 sm:h-12 sm:w-12" />, label: 'Heavy snow', gradient: 'from-cyan-500 to-blue-500', bgGradient: 'from-cyan-500/20 to-blue-500/20' },
  80: { icon: <CloudRain className="h-8 w-8 sm:h-12 sm:w-12" />, label: 'Rain showers', gradient: 'from-blue-400 to-teal-500', bgGradient: 'from-blue-400/20 to-teal-500/20' },
  81: { icon: <CloudRain className="h-8 w-8 sm:h-12 sm:w-12" />, label: 'Moderate showers', gradient: 'from-blue-500 to-teal-600', bgGradient: 'from-blue-500/20 to-teal-600/20' },
  82: { icon: <CloudRain className="h-8 w-8 sm:h-12 sm:w-12" />, label: 'Violent showers', gradient: 'from-blue-600 to-teal-700', bgGradient: 'from-blue-600/20 to-teal-700/20' },
  95: { icon: <CloudLightning className="h-8 w-8 sm:h-12 sm:w-12" />, label: 'Thunderstorm', gradient: 'from-purple-400 to-pink-500', bgGradient: 'from-purple-400/20 to-pink-500/20' },
  96: { icon: <CloudLightning className="h-8 w-8 sm:h-12 sm:w-12" />, label: 'Thunderstorm + hail', gradient: 'from-purple-500 to-pink-600', bgGradient: 'from-purple-500/20 to-pink-600/20' },
  99: { icon: <CloudLightning className="h-8 w-8 sm:h-12 sm:w-12" />, label: 'Heavy thunderstorm', gradient: 'from-purple-600 to-pink-700', bgGradient: 'from-purple-600/20 to-pink-700/20' },
};

const getWeatherInfo = (code: number) => {
  return weatherCodes[code] || weatherCodes[0];
};

const WeatherForecast = () => {
  const [weather, setWeather] = useState<WeatherData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedDay, setSelectedDay] = useState(0);
  const [copied, setCopied] = useState(false);

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

  const getShareText = () => {
    if (!weather) return '';
    const currentWeather = getWeatherInfo(weather.current.weatherCode);
    return `🌤️ Weather in ${weather.location.name}: ${weather.current.temperature}°C - ${currentWeather.label}\n\n📊 10-Day Forecast powered by GraphCast AI\n\nCheck it out on TriviaBees! 🐝`;
  };

  const shareToFacebook = () => {
    const url = encodeURIComponent(window.location.href);
    window.open(`https://www.facebook.com/sharer/sharer.php?u=${url}&quote=${encodeURIComponent(getShareText())}`, '_blank');
  };

  const shareToTwitter = () => {
    const text = encodeURIComponent(getShareText());
    const url = encodeURIComponent(window.location.href);
    window.open(`https://twitter.com/intent/tweet?text=${text}&url=${url}`, '_blank');
  };

  const shareToWhatsApp = () => {
    const text = encodeURIComponent(getShareText() + '\n' + window.location.href);
    window.open(`https://wa.me/?text=${text}`, '_blank');
  };

  const shareToTelegram = () => {
    const text = encodeURIComponent(getShareText());
    const url = encodeURIComponent(window.location.href);
    window.open(`https://t.me/share/url?url=${url}&text=${text}`, '_blank');
  };

  const copyToClipboard = async () => {
    try {
      await navigator.clipboard.writeText(getShareText() + '\n' + window.location.href);
      setCopied(true);
      toast.success('Copied to clipboard!');
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      toast.error('Failed to copy');
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[300px] sm:min-h-[400px]">
        <div className="text-center space-y-4">
          <div className="relative">
            <div className="absolute inset-0 bg-gradient-to-r from-blue-500 to-cyan-500 rounded-full blur-xl opacity-50 animate-pulse" />
            <Loader2 className="h-10 w-10 sm:h-12 sm:w-12 animate-spin text-primary mx-auto relative" />
          </div>
          <p className="text-muted-foreground text-sm sm:text-base">Loading GraphCast AI Weather...</p>
        </div>
      </div>
    );
  }

  if (error || !weather) {
    return (
      <div className="text-center py-8 sm:py-12">
        <div className="p-4 rounded-full bg-gradient-to-br from-gray-500/20 to-slate-500/20 inline-block mb-4">
          <Cloud className="h-10 w-10 sm:h-12 sm:w-12 text-muted-foreground" />
        </div>
        <p className="text-muted-foreground mb-4 text-sm sm:text-base">{error || 'Unable to load weather'}</p>
        <Button onClick={() => fetchWeather(14.5995, 120.9842, 'Manila')} className="bg-gradient-to-r from-blue-500 to-cyan-500 hover:from-blue-600 hover:to-cyan-600">
          <RefreshCw className="h-4 w-4 mr-2" /> Try Again
        </Button>
      </div>
    );
  }

  const currentWeather = getWeatherInfo(weather.current.weatherCode);
  const selectedDayData = weather.daily[selectedDay];
  const selectedDayWeather = getWeatherInfo(selectedDayData.weatherCode);

  return (
    <div className="space-y-4 sm:space-y-6 px-1">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex-1 min-w-0">
          <h1 className="text-xl sm:text-2xl md:text-3xl font-bold bg-gradient-to-r from-blue-500 via-cyan-500 to-teal-500 bg-clip-text text-transparent truncate">
            GraphCast AI Weather
          </h1>
          <p className="text-xs sm:text-sm text-muted-foreground mt-1">
            10-day AI-powered predictions
          </p>
        </div>
        <div className="flex items-center gap-2">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="sm" className="gap-2 bg-gradient-to-r from-pink-500/10 to-purple-500/10 border-pink-500/30 hover:border-pink-500/50">
                <Share2 className="h-4 w-4 text-pink-500" />
                <span className="hidden sm:inline">Share</span>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-48">
              <DropdownMenuItem onClick={shareToFacebook} className="gap-3 cursor-pointer">
                <div className="p-1.5 rounded-full bg-blue-600">
                  <Facebook className="h-3.5 w-3.5 text-white" />
                </div>
                Facebook
              </DropdownMenuItem>
              <DropdownMenuItem onClick={shareToTwitter} className="gap-3 cursor-pointer">
                <div className="p-1.5 rounded-full bg-sky-500">
                  <Twitter className="h-3.5 w-3.5 text-white" />
                </div>
                Twitter / X
              </DropdownMenuItem>
              <DropdownMenuItem onClick={shareToWhatsApp} className="gap-3 cursor-pointer">
                <div className="p-1.5 rounded-full bg-green-500">
                  <MessageCircle className="h-3.5 w-3.5 text-white" />
                </div>
                WhatsApp
              </DropdownMenuItem>
              <DropdownMenuItem onClick={shareToTelegram} className="gap-3 cursor-pointer">
                <div className="p-1.5 rounded-full bg-blue-500">
                  <Send className="h-3.5 w-3.5 text-white" />
                </div>
                Telegram
              </DropdownMenuItem>
              <DropdownMenuItem onClick={copyToClipboard} className="gap-3 cursor-pointer">
                <div className="p-1.5 rounded-full bg-gray-500">
                  {copied ? <Check className="h-3.5 w-3.5 text-white" /> : <Copy className="h-3.5 w-3.5 text-white" />}
                </div>
                Copy Link
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
          <Button 
            variant="outline" 
            size="icon" 
            className="h-9 w-9 bg-gradient-to-r from-blue-500/10 to-cyan-500/10 border-blue-500/30 hover:border-blue-500/50"
            onClick={() => fetchWeather(weather.location.lat, weather.location.lon, weather.location.name)}
          >
            <RefreshCw className="h-4 w-4 text-blue-500" />
          </Button>
        </div>
      </div>

      {/* Location */}
      <div className="flex flex-wrap items-center gap-2 text-muted-foreground">
        <div className="flex items-center gap-1.5">
          <MapPin className="h-4 w-4 text-red-500" />
          <span className="text-sm font-medium">{weather.location.name}</span>
        </div>
        <Badge className="bg-gradient-to-r from-purple-500 to-blue-500 text-white border-0 text-xs">
          <TrendingUp className="h-3 w-3 mr-1" />
          AI Prediction
        </Badge>
      </div>

      {/* Current Weather Card */}
      <Card className={`bg-gradient-to-br ${currentWeather.bgGradient} border-0 shadow-lg overflow-hidden`}>
        <CardContent className="p-4 sm:p-6">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4 sm:gap-6">
            {/* Main Temperature Display */}
            <div className="flex items-center gap-4 sm:gap-6 w-full sm:w-auto justify-center sm:justify-start">
              <div className={`p-3 sm:p-4 rounded-2xl bg-gradient-to-br ${currentWeather.gradient} text-white shadow-lg`}>
                {currentWeather.icon}
              </div>
              <div className="text-center sm:text-left">
                <div className="text-4xl sm:text-5xl md:text-6xl font-bold bg-gradient-to-r from-foreground to-foreground/70 bg-clip-text">
                  {weather.current.temperature}°C
                </div>
                <p className={`font-semibold bg-gradient-to-r ${currentWeather.gradient} bg-clip-text text-transparent text-sm sm:text-base`}>
                  {currentWeather.label}
                </p>
                <p className="text-xs sm:text-sm text-muted-foreground">
                  Feels like {weather.current.feelsLike}°C
                </p>
              </div>
            </div>
            
            {/* Weather Details Grid */}
            <div className="grid grid-cols-2 gap-2 sm:gap-3 w-full sm:w-auto">
              <div className="flex items-center gap-2 p-2 sm:p-3 rounded-xl bg-blue-500/10 backdrop-blur-sm">
                <Droplets className="h-4 w-4 sm:h-5 sm:w-5 text-blue-500" />
                <div>
                  <p className="text-[10px] sm:text-xs text-muted-foreground">Humidity</p>
                  <p className="font-bold text-sm sm:text-base">{weather.current.humidity}%</p>
                </div>
              </div>
              <div className="flex items-center gap-2 p-2 sm:p-3 rounded-xl bg-gray-500/10 backdrop-blur-sm">
                <Wind className="h-4 w-4 sm:h-5 sm:w-5 text-gray-500" />
                <div>
                  <p className="text-[10px] sm:text-xs text-muted-foreground">Wind</p>
                  <p className="font-bold text-sm sm:text-base">{weather.current.windSpeed} km/h</p>
                </div>
              </div>
              <div className="flex items-center gap-2 p-2 sm:p-3 rounded-xl bg-green-500/10 backdrop-blur-sm">
                <Eye className="h-4 w-4 sm:h-5 sm:w-5 text-green-500" />
                <div>
                  <p className="text-[10px] sm:text-xs text-muted-foreground">Visibility</p>
                  <p className="font-bold text-sm sm:text-base">{weather.current.visibility} km</p>
                </div>
              </div>
              <div className="flex items-center gap-2 p-2 sm:p-3 rounded-xl bg-purple-500/10 backdrop-blur-sm">
                <Gauge className="h-4 w-4 sm:h-5 sm:w-5 text-purple-500" />
                <div>
                  <p className="text-[10px] sm:text-xs text-muted-foreground">Pressure</p>
                  <p className="font-bold text-sm sm:text-base">{weather.current.pressure} hPa</p>
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* 10-Day Forecast */}
      <Card className="border-0 shadow-lg bg-gradient-to-br from-background to-muted/30">
        <CardHeader className="pb-2 px-3 sm:px-6">
          <CardTitle className="flex items-center gap-2 text-base sm:text-lg">
            <div className="p-1.5 rounded-lg bg-gradient-to-r from-orange-500 to-amber-500">
              <Calendar className="h-4 w-4 text-white" />
            </div>
            10-Day Forecast
          </CardTitle>
        </CardHeader>
        <CardContent className="px-2 sm:px-6">
          <ScrollArea className="w-full pb-2">
            <div className="flex gap-1.5 sm:gap-2 min-w-max px-1">
              {weather.daily.map((day, idx) => {
                const dayWeather = getWeatherInfo(day.weatherCode);
                const isToday = idx === 0;
                const isSelected = idx === selectedDay;
                
                return (
                  <Button
                    key={day.date}
                    variant="ghost"
                    className={`flex flex-col items-center h-auto py-2 sm:py-3 px-2 sm:px-4 min-w-[60px] sm:min-w-[80px] rounded-xl transition-all ${
                      isSelected 
                        ? `bg-gradient-to-br ${dayWeather.gradient} text-white shadow-lg scale-105` 
                        : 'hover:bg-muted/50'
                    }`}
                    onClick={() => setSelectedDay(idx)}
                  >
                    <span className={`text-[10px] sm:text-xs font-medium ${isSelected ? 'text-white/90' : ''}`}>
                      {isToday ? 'Today' : format(new Date(day.date), 'EEE')}
                    </span>
                    <span className={`text-[10px] sm:text-xs ${isSelected ? 'text-white/70' : 'text-muted-foreground'}`}>
                      {format(new Date(day.date), 'MMM d')}
                    </span>
                    <div className={`my-1.5 sm:my-2 ${isSelected ? '' : `bg-gradient-to-br ${dayWeather.gradient} bg-clip-text text-transparent`}`}>
                      {isSelected ? (
                        <div className="text-white">{dayWeather.icon}</div>
                      ) : (
                        <div className={`bg-gradient-to-br ${dayWeather.gradient} p-1.5 rounded-lg`}>
                          <div className="text-white [&>svg]:h-5 [&>svg]:w-5 sm:[&>svg]:h-6 sm:[&>svg]:w-6">{dayWeather.icon}</div>
                        </div>
                      )}
                    </div>
                    <div className="text-xs sm:text-sm">
                      <span className={`font-bold ${isSelected ? 'text-white' : ''}`}>{day.tempMax}°</span>
                      <span className={`ml-0.5 sm:ml-1 ${isSelected ? 'text-white/70' : 'text-muted-foreground'}`}>{day.tempMin}°</span>
                    </div>
                  </Button>
                );
              })}
            </div>
          </ScrollArea>
        </CardContent>
      </Card>

      {/* Selected Day Details */}
      <Card className="border-0 shadow-lg bg-gradient-to-br from-background to-muted/30">
        <CardHeader className="pb-2 px-3 sm:px-6">
          <CardTitle className="flex items-center gap-2 text-base sm:text-lg">
            <div className={`p-1.5 rounded-lg bg-gradient-to-r ${selectedDayWeather.gradient}`}>
              <div className="text-white [&>svg]:h-4 [&>svg]:w-4">{selectedDayWeather.icon}</div>
            </div>
            {selectedDay === 0 ? 'Today' : format(new Date(selectedDayData.date), 'EEEE, MMM d')}
          </CardTitle>
        </CardHeader>
        <CardContent className="px-3 sm:px-6">
          <div className="grid grid-cols-2 gap-2 sm:gap-3">
            <div className="flex items-center gap-2 sm:gap-3 p-2.5 sm:p-4 rounded-xl bg-gradient-to-br from-red-500/10 to-orange-500/10">
              <div className="p-1.5 sm:p-2 rounded-lg bg-gradient-to-br from-red-500 to-orange-500">
                <Thermometer className="h-4 w-4 sm:h-5 sm:w-5 text-white" />
              </div>
              <div>
                <p className="text-[10px] sm:text-xs text-muted-foreground">High / Low</p>
                <p className="font-bold text-sm sm:text-base">{selectedDayData.tempMax}° / {selectedDayData.tempMin}°</p>
              </div>
            </div>
            <div className="flex items-center gap-2 sm:gap-3 p-2.5 sm:p-4 rounded-xl bg-gradient-to-br from-blue-500/10 to-cyan-500/10">
              <div className="p-1.5 sm:p-2 rounded-lg bg-gradient-to-br from-blue-500 to-cyan-500">
                <CloudRain className="h-4 w-4 sm:h-5 sm:w-5 text-white" />
              </div>
              <div>
                <p className="text-[10px] sm:text-xs text-muted-foreground">Precipitation</p>
                <p className="font-bold text-sm sm:text-base">{selectedDayData.precipitation} mm</p>
              </div>
            </div>
            <div className="flex items-center gap-2 sm:gap-3 p-2.5 sm:p-4 rounded-xl bg-gradient-to-br from-gray-500/10 to-slate-500/10">
              <div className="p-1.5 sm:p-2 rounded-lg bg-gradient-to-br from-gray-500 to-slate-500">
                <Wind className="h-4 w-4 sm:h-5 sm:w-5 text-white" />
              </div>
              <div>
                <p className="text-[10px] sm:text-xs text-muted-foreground">Wind Speed</p>
                <p className="font-bold text-sm sm:text-base">{selectedDayData.windSpeed} km/h</p>
              </div>
            </div>
            <div className={`flex items-center gap-2 sm:gap-3 p-2.5 sm:p-4 rounded-xl bg-gradient-to-br ${selectedDayWeather.bgGradient}`}>
              <div className={`p-1.5 sm:p-2 rounded-lg bg-gradient-to-br ${selectedDayWeather.gradient}`}>
                <div className="text-white [&>svg]:h-4 [&>svg]:w-4 sm:[&>svg]:h-5 sm:[&>svg]:w-5">{selectedDayWeather.icon}</div>
              </div>
              <div>
                <p className="text-[10px] sm:text-xs text-muted-foreground">Condition</p>
                <p className="font-bold text-xs sm:text-sm">{selectedDayWeather.label}</p>
              </div>
            </div>
          </div>

          {/* Sun times */}
          <div className="flex items-center justify-center gap-4 sm:gap-8 mt-4 pt-4 border-t border-border/50">
            <div className="flex items-center gap-2 sm:gap-3 p-2 sm:p-3 rounded-xl bg-gradient-to-br from-orange-400/10 to-yellow-400/10">
              <div className="p-1.5 sm:p-2 rounded-lg bg-gradient-to-br from-orange-400 to-yellow-400">
                <Sunrise className="h-4 w-4 sm:h-5 sm:w-5 text-white" />
              </div>
              <div>
                <p className="text-[10px] sm:text-xs text-muted-foreground">Sunrise</p>
                <p className="font-bold text-sm sm:text-base">{format(new Date(selectedDayData.sunrise), 'h:mm a')}</p>
              </div>
            </div>
            <div className="flex items-center gap-2 sm:gap-3 p-2 sm:p-3 rounded-xl bg-gradient-to-br from-orange-600/10 to-red-500/10">
              <div className="p-1.5 sm:p-2 rounded-lg bg-gradient-to-br from-orange-600 to-red-500">
                <Sunset className="h-4 w-4 sm:h-5 sm:w-5 text-white" />
              </div>
              <div>
                <p className="text-[10px] sm:text-xs text-muted-foreground">Sunset</p>
                <p className="font-bold text-sm sm:text-base">{format(new Date(selectedDayData.sunset), 'h:mm a')}</p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* AI Info */}
      <Card className="bg-gradient-to-r from-purple-500/10 via-blue-500/10 to-cyan-500/10 border-0 shadow-lg overflow-hidden">
        <CardContent className="p-4 sm:pt-6">
          <div className="flex items-start gap-3 sm:gap-4">
            <div className="p-2.5 sm:p-3 rounded-2xl bg-gradient-to-br from-purple-500 to-blue-500 shadow-lg">
              <TrendingUp className="h-5 w-5 sm:h-6 sm:w-6 text-white" />
            </div>
            <div className="flex-1 min-w-0">
              <h3 className="font-bold text-sm sm:text-base mb-1 bg-gradient-to-r from-purple-500 to-blue-500 bg-clip-text text-transparent">
                About GraphCast AI
              </h3>
              <p className="text-xs sm:text-sm text-muted-foreground leading-relaxed">
                GraphCast is Google DeepMind's AI weather model providing 10-day forecasts 
                with remarkable accuracy using machine learning trained on decades of data.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default WeatherForecast;
