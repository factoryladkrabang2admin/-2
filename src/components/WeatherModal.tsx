import React, { useState, useEffect } from 'react';
import {
  X,
  MapPin,
  RefreshCw,
  Sun,
  CloudSun,
  Cloud,
  CloudRain,
  CloudDrizzle,
  CloudLightning,
  Wind,
  Droplets,
  Thermometer,
  Eye,
  CheckCircle2,
  Navigation
} from 'lucide-react';
import { WeatherData, fetchCurrentWeather } from '../services/weatherService';
import { useLanguage } from '../contexts/LanguageContext';

interface WeatherModalProps {
  isOpen: boolean;
  onClose: () => void;
  cachedWeather?: WeatherData | null;
  onUpdateWeather?: (data: WeatherData) => void;
}

export const WeatherModal: React.FC<WeatherModalProps> = ({
  isOpen,
  onClose,
  cachedWeather,
  onUpdateWeather
}) => {
  const { language } = useLanguage();
  const [weather, setWeather] = useState<WeatherData | null>(cachedWeather || null);
  const [loading, setLoading] = useState(false);
  const [autoShow, setAutoShow] = useState(() => {
    return localStorage.getItem('auto_show_weather_modal') !== 'false';
  });

  const loadWeather = async () => {
    setLoading(true);
    try {
      const data = await fetchCurrentWeather();
      setWeather(data);
      onUpdateWeather?.(data);
    } catch (err) {
      console.error('Failed to load weather:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen && !weather) {
      loadWeather();
    }
  }, [isOpen]);

  const handleToggleAutoShow = (e: React.ChangeEvent<HTMLInputElement>) => {
    const checked = e.target.checked;
    setAutoShow(checked);
    localStorage.setItem('auto_show_weather_modal', checked ? 'true' : 'false');
  };

  if (!isOpen) return null;

  const renderWeatherIcon = (code: number, isDay = true, className = 'w-10 h-10') => {
    if (code === 0) {
      return isDay ? (
        <Sun className={`${className} text-amber-500 animate-spin-slow`} />
      ) : (
        <Sun className={`${className} text-indigo-300`} />
      );
    }
    if (code === 1 || code === 2) {
      return <CloudSun className={`${className} text-amber-500`} />;
    }
    if (code === 3 || code === 45 || code === 48) {
      return <Cloud className={`${className} text-slate-400`} />;
    }
    if (code >= 51 && code <= 55) {
      return <CloudDrizzle className={`${className} text-sky-400`} />;
    }
    if (code >= 61 && code <= 82) {
      return <CloudRain className={`${className} text-blue-500`} />;
    }
    if (code >= 95) {
      return <CloudLightning className={`${className} text-amber-400`} />;
    }
    return <CloudSun className={`${className} text-amber-500`} />;
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 landscape:p-2 landscape:py-1.5 bg-slate-950/65 backdrop-blur-xs transition-opacity animate-in fade-in duration-200">
      <div className="relative w-full max-w-[94vw] xs:max-w-md sm:max-w-lg md:max-w-xl bg-white dark:bg-slate-900 rounded-2xl sm:rounded-3xl shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden flex flex-col max-h-[92dvh] landscape:max-h-[95dvh]">
        {/* Header with Google Weather Style Gradient */}
        <div className="relative p-3.5 sm:p-5 landscape:p-3 landscape:py-2.5 bg-gradient-to-br from-sky-500 via-blue-600 to-indigo-700 text-white overflow-hidden shrink-0">
          {/* Decorative background sun glow */}
          <div className="absolute -top-10 -right-10 w-36 sm:w-44 h-36 sm:h-44 rounded-full bg-white/10 blur-2xl pointer-events-none" />
          <div className="absolute bottom-0 right-12 w-28 sm:w-32 h-28 sm:h-32 rounded-full bg-sky-300/15 blur-xl pointer-events-none" />

          {/* Top Row: Tag + Controls */}
          <div className="relative flex items-center justify-between gap-2 mb-2 sm:mb-3 landscape:mb-1.5 z-10">
            <div className="flex items-center gap-1.5 sm:gap-2 flex-wrap min-w-0">
              <span className="inline-flex items-center gap-1 sm:gap-1.5 px-2.5 py-0.5 sm:py-1 rounded-full bg-white/20 backdrop-blur-md text-[10px] sm:text-xs font-bold text-white border border-white/25 shadow-xs whitespace-nowrap">
                {/* Google Logo Dot Colors */}
                <span className="flex items-center gap-0.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-blue-300" />
                  <span className="w-1.5 h-1.5 rounded-full bg-red-400" />
                  <span className="w-1.5 h-1.5 rounded-full bg-yellow-300" />
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-300" />
                </span>
                <span>Google Weather</span>
              </span>

              {weather && (
                <span
                  className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] sm:text-[11px] font-semibold border whitespace-nowrap ${
                    weather.isGps
                      ? 'bg-emerald-500/25 border-emerald-300/40 text-emerald-100'
                      : 'bg-amber-500/25 border-amber-300/40 text-amber-100'
                  }`}
                  title={weather.isGps ? 'ระบุพิกัดจาก GPS เครื่องโดยตรง' : 'ใช้พิกัดมาตรฐานโรงงานลาดกระบัง 2'}
                >
                  <Navigation className="w-2.5 h-2.5 sm:w-3 sm:h-3" />
                  <span>{weather.isGps ? 'GPS อุปกรณ์' : 'พิกัดลาดกระบัง'}</span>
                </span>
              )}
            </div>

            <div className="flex items-center gap-1 sm:gap-1.5 shrink-0">
              <button
                type="button"
                onClick={loadWeather}
                disabled={loading}
                className="p-1.5 sm:p-2 rounded-lg sm:rounded-xl bg-white/15 hover:bg-white/25 active:scale-95 text-white transition-all cursor-pointer backdrop-blur-xs disabled:opacity-50"
                title={language === 'th' ? 'อัปเดตสภาพอากาศล่าสุด' : 'Refresh Weather'}
                aria-label="Refresh weather"
              >
                <RefreshCw className={`w-3.5 h-3.5 sm:w-4 sm:h-4 ${loading ? 'animate-spin' : ''}`} />
              </button>
              <button
                type="button"
                onClick={onClose}
                className="p-1.5 sm:p-2 rounded-lg sm:rounded-xl bg-white/15 hover:bg-white/25 active:scale-95 text-white transition-all cursor-pointer backdrop-blur-xs"
                title={language === 'th' ? 'ปิดหน้าต่าง' : 'Close'}
                aria-label="Close modal"
              >
                <X className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
              </button>
            </div>
          </div>

          {/* Location and Main Weather Display */}
          <div className="relative z-10 flex items-center justify-between gap-2 sm:gap-4">
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-1 text-sky-100 text-[11px] sm:text-xs font-semibold mb-0.5 sm:mb-1">
                <MapPin className="w-3 h-3 sm:w-3.5 sm:h-3.5 shrink-0 text-sky-200" />
                <span className="truncate max-w-[190px] xs:max-w-[240px] sm:max-w-xs">
                  {weather ? weather.locationName : (language === 'th' ? 'กำลังค้นหาตำแหน่ง GPS...' : 'Locating GPS...')}
                </span>
              </div>

              <div className="flex items-baseline gap-1.5 sm:gap-2">
                <span className="text-3xl sm:text-5xl landscape:text-3xl font-black tracking-tight text-white drop-shadow-sm">
                  {weather ? `${weather.temperature}°` : '--°'}
                </span>
                <span className="text-lg sm:text-2xl landscape:text-lg font-bold text-sky-100">C</span>
                {weather && (
                  <span className="text-[11px] sm:text-xs text-sky-100 ml-1 truncate">
                    {language === 'th' ? `รู้สึกเหมือน ${weather.apparentTemperature}°` : `Feels like ${weather.apparentTemperature}°`}
                  </span>
                )}
              </div>

              <p className="text-xs sm:text-sm font-semibold text-sky-100 mt-0.5 sm:mt-1 truncate">
                {weather ? (language === 'th' ? weather.weatherDescriptionTh : weather.weatherDescriptionEn) : (language === 'th' ? 'กำลังโหลดข้อมูลอากาศ...' : 'Loading weather...')}
              </p>
            </div>

            {/* Weather Large Icon */}
            <div className="p-2.5 sm:p-3.5 landscape:p-2 bg-white/15 backdrop-blur-md rounded-xl sm:rounded-2xl border border-white/25 shadow-lg flex items-center justify-center shrink-0">
              {weather ? (
                renderWeatherIcon(weather.weatherCode, weather.isDay, 'w-9 h-9 sm:w-12 sm:h-12 landscape:w-8 landscape:h-8')
              ) : (
                <Sun className="w-9 h-9 sm:w-12 sm:h-12 landscape:w-8 landscape:h-8 text-amber-300 animate-pulse" />
              )}
            </div>
          </div>

          {weather && (
            <div className="relative z-10 mt-2 sm:mt-3 pt-2 sm:pt-3 border-t border-white/20 flex items-center justify-between text-[10px] sm:text-[11px] text-sky-100">
              <span className="truncate">{language === 'th' ? `อัปเดต: ${weather.updatedAt} น.` : `Updated: ${weather.updatedAt}`}</span>
              <span className="flex items-center gap-1 shrink-0 ml-2">
                <CheckCircle2 className="w-3 h-3 text-emerald-300" />
                <span>{weather.isGps ? (language === 'th' ? 'GPS แม่นยำ' : 'GPS') : (language === 'th' ? 'ลาดกระบัง 2' : 'Ladkrabang 2')}</span>
              </span>
            </div>
          )}
        </div>

        {/* Modal Body: Metrics, Forecasts, and Links */}
        <div className="p-3 sm:p-4 md:p-5 overflow-y-auto space-y-3 sm:space-y-4 overscroll-contain">
          {/* Key Metric Tiles */}
          {weather && (
            <div className="grid grid-cols-3 gap-1.5 sm:gap-2.5">
              <div className="p-2 sm:p-3 rounded-xl sm:rounded-2xl bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700/80 flex flex-col items-center text-center">
                <Droplets className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-blue-500 mb-0.5 sm:mb-1" />
                <span className="text-[10px] sm:text-[11px] text-slate-500 dark:text-slate-400 truncate">{language === 'th' ? 'ความชื้น' : 'Humidity'}</span>
                <span className="text-xs sm:text-sm font-bold text-slate-800 dark:text-slate-100 mt-0.5">{weather.humidity}%</span>
              </div>

              <div className="p-2 sm:p-3 rounded-xl sm:rounded-2xl bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700/80 flex flex-col items-center text-center">
                <Wind className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-teal-500 mb-0.5 sm:mb-1" />
                <span className="text-[10px] sm:text-[11px] text-slate-500 dark:text-slate-400 truncate">{language === 'th' ? 'ความเร็วลม' : 'Wind'}</span>
                <span className="text-xs sm:text-sm font-bold text-slate-800 dark:text-slate-100 mt-0.5">{weather.windSpeed} km/h</span>
              </div>

              <div className="p-2 sm:p-3 rounded-xl sm:rounded-2xl bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700/80 flex flex-col items-center text-center">
                <CloudRain className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-indigo-500 mb-0.5 sm:mb-1" />
                <span className="text-[10px] sm:text-[11px] text-slate-500 dark:text-slate-400 truncate">{language === 'th' ? 'ปริมาณฝน' : 'Precipitation'}</span>
                <span className="text-xs sm:text-sm font-bold text-slate-800 dark:text-slate-100 mt-0.5">{weather.precipitation} mm</span>
              </div>
            </div>
          )}

          {/* Hourly Forecast */}
          {weather && weather.hourlyForecast.length > 0 && (
            <div className="space-y-1.5 sm:space-y-2">
              <p className="text-[11px] sm:text-xs font-bold text-slate-700 dark:text-slate-300">
                {language === 'th' ? 'พยากรณ์รายชั่วโมงถัดไป' : 'Next Hours Forecast'}
              </p>
              <div className="flex items-center gap-1.5 sm:gap-2 overflow-x-auto pb-1 scrollbar-thin">
                {weather.hourlyForecast.map((hour, idx) => (
                  <div
                    key={idx}
                    className="min-w-[62px] sm:min-w-[70px] p-2 sm:p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700/60 flex flex-col items-center text-center shrink-0"
                  >
                    <span className="text-[10px] sm:text-[11px] font-semibold text-slate-500 dark:text-slate-400">{hour.time}</span>
                    <div className="my-1 sm:my-1.5">{renderWeatherIcon(hour.weatherCode, true, 'w-5 h-5 sm:w-6 sm:h-6')}</div>
                    <span className="text-xs font-bold text-slate-800 dark:text-slate-200">{hour.temp}°</span>
                    {hour.precipitationProb > 0 && (
                      <span className="text-[9px] font-semibold text-blue-600 dark:text-blue-400 mt-0.5">
                        💧{hour.precipitationProb}%
                      </span>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* 5-Day Forecast */}
          {weather && weather.dailyForecast.length > 0 && (
            <div className="space-y-1.5 sm:space-y-2">
              <p className="text-[11px] sm:text-xs font-bold text-slate-700 dark:text-slate-300">
                {language === 'th' ? 'พยากรณ์ 5 วันล่วงหน้า' : '5-Day Forecast'}
              </p>
              <div className="bg-slate-50 dark:bg-slate-800/50 rounded-xl sm:rounded-2xl border border-slate-200 dark:border-slate-700 divide-y divide-slate-200/80 dark:divide-slate-700/80">
                {weather.dailyForecast.map((day, idx) => (
                  <div key={idx} className="p-2 sm:p-2.5 px-3 sm:px-3.5 flex items-center justify-between text-[11px] sm:text-xs">
                    <span className="font-bold text-slate-700 dark:text-slate-200 w-12 sm:w-14">{day.dayNameTh}</span>
                    <div className="flex items-center gap-1.5">
                      {renderWeatherIcon(day.weatherCode, true, 'w-4 h-4 sm:w-5 sm:h-5')}
                      {day.precipitationProb > 20 && (
                        <span className="text-[9px] sm:text-[10px] text-blue-600 dark:text-blue-400 font-semibold">
                          {day.precipitationProb}%
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-1.5 sm:gap-2 font-mono">
                      <span className="font-bold text-slate-900 dark:text-slate-100">{day.maxTemp}°</span>
                      <span className="text-slate-400 dark:text-slate-500">{day.minTemp}°</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Modal Footer with Auto-Show Preference */}
        <div className="p-2.5 sm:p-3.5 px-3.5 sm:px-5 bg-slate-100/90 dark:bg-slate-800/90 border-t border-slate-200 dark:border-slate-700 flex items-center justify-between gap-2 text-xs text-slate-600 dark:text-slate-400 shrink-0">
          <label className="flex items-center gap-1.5 sm:gap-2 cursor-pointer select-none min-w-0">
            <input
              type="checkbox"
              checked={autoShow}
              onChange={handleToggleAutoShow}
              className="w-3.5 h-3.5 sm:w-4 sm:h-4 rounded text-blue-600 border-slate-300 focus:ring-blue-500 cursor-pointer shrink-0"
            />
            <span className="text-[10px] sm:text-[11px] font-medium truncate">
              {language === 'th' ? 'แสดงอัตโนมัติเมื่อเปิดเว็บ' : 'Show automatically on visit'}
            </span>
          </label>

          <button
            type="button"
            onClick={onClose}
            className="px-3 sm:px-3.5 py-1 sm:py-1.5 rounded-lg sm:rounded-xl bg-white dark:bg-slate-700 hover:bg-slate-50 dark:hover:bg-slate-600 text-slate-700 dark:text-slate-200 font-bold border border-slate-200 dark:border-slate-600 transition-colors cursor-pointer shadow-2xs shrink-0 text-xs"
          >
            {language === 'th' ? 'ปิด' : 'Close'}
          </button>
        </div>
      </div>
    </div>
  );
};
