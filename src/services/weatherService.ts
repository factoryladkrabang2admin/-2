export interface WeatherData {
  latitude: number;
  longitude: number;
  locationName: string;
  district: string;
  province: string;
  isGps: boolean;
  temperature: number;
  apparentTemperature: number;
  humidity: number;
  windSpeed: number;
  precipitation: number;
  weatherCode: number;
  weatherDescriptionTh: string;
  weatherDescriptionEn: string;
  isDay: boolean;
  uvIndex?: number;
  updatedAt: string;
  hourlyForecast: {
    time: string;
    temp: number;
    weatherCode: number;
    precipitationProb: number;
  }[];
  dailyForecast: {
    date: string;
    dayNameTh: string;
    maxTemp: number;
    minTemp: number;
    weatherCode: number;
    precipitationProb: number;
  }[];
}

// Default Coordinates: Ladkrabang 2, Bangkok
export const DEFAULT_COORDS = {
  latitude: 13.7279,
  longitude: 100.7783,
  locationName: 'โรงงานลาดกระบัง 2',
  district: 'เขตลาดกระบัง',
  province: 'กรุงเทพมหานคร'
};

// Weather Code mapping according to WMO Code
export function getWeatherDetails(code: number, isDay = true): { th: string; en: string; iconType: string } {
  switch (code) {
    case 0:
      return { th: isDay ? 'ท้องฟ้าแจ่มใส แดดจัด' : 'ท้องฟ้าแจ่มใส', en: isDay ? 'Clear Sky / Sunny' : 'Clear Sky', iconType: isDay ? 'sun' : 'moon' };
    case 1:
      return { th: 'ท้องฟ้าโปร่ง มีเมฆเล็กน้อย', en: 'Mainly Clear', iconType: isDay ? 'sun-cloud' : 'moon-cloud' };
    case 2:
      return { th: 'มีเมฆเป็นบางส่วน', en: 'Partly Cloudy', iconType: 'cloud-sun' };
    case 3:
      return { th: 'มีเมฆครึ้ม / ท้องฟ้ามืด', en: 'Overcast', iconType: 'cloud' };
    case 45:
    case 48:
      return { th: 'มีหมอกหนา / หมอกควัน', en: 'Foggy / Haze', iconType: 'cloud-fog' };
    case 51:
    case 53:
    case 55:
      return { th: 'ฝนปรอยๆ ละอองฝน', en: 'Drizzle', iconType: 'cloud-drizzle' };
    case 61:
      return { th: 'ฝนตกเล็กน้อย', en: 'Slight Rain', iconType: 'cloud-rain' };
    case 63:
      return { th: 'ฝนตกปานกลาง', en: 'Moderate Rain', iconType: 'cloud-rain' };
    case 65:
      return { th: 'ฝนตกหนัก', en: 'Heavy Rain', iconType: 'cloud-rain' };
    case 80:
    case 81:
    case 82:
      return { th: 'ฝนซู่กระจายเป็นหย่อมๆ', en: 'Rain Showers', iconType: 'cloud-rain' };
    case 95:
      return { th: 'ฝนฟ้าคะนอง พายุฝน', en: 'Thunderstorm', iconType: 'cloud-lightning' };
    case 96:
    case 99:
      return { th: 'พายุฝนฟ้าคะนองรุนแรง ลมกระโชก', en: 'Severe Thunderstorm', iconType: 'cloud-lightning' };
    default:
      return { th: 'สภาพอากาศปกติ', en: 'Normal Conditions', iconType: 'cloud-sun' };
  }
}

/**
 * Get device GPS location with timeout
 */
export async function getDeviceCoordinates(): Promise<{ latitude: number; longitude: number; isGps: boolean }> {
  if (!('geolocation' in navigator)) {
    return { latitude: DEFAULT_COORDS.latitude, longitude: DEFAULT_COORDS.longitude, isGps: false };
  }

  return new Promise((resolve) => {
    navigator.geolocation.getCurrentPosition(
      (position) => {
        resolve({
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
          isGps: true
        });
      },
      (error) => {
        console.warn('Geolocation access failed or denied, using Ladkrabang fallback:', error.message);
        resolve({
          latitude: DEFAULT_COORDS.latitude,
          longitude: DEFAULT_COORDS.longitude,
          isGps: false
        });
      },
      {
        enableHighAccuracy: true,
        timeout: 7000,
        maximumAge: 300000 // 5 minutes cache
      }
    );
  });
}

/**
 * Reverse geocode coordinates to Thai administrative location
 */
export async function reverseGeocode(lat: number, lon: number): Promise<{ locationName: string; district: string; province: string }> {
  try {
    const res = await fetch(`https://api.bigdatacloud.net/data/reverse-geocode-client?latitude=${lat}&longitude=${lon}&localityLanguage=th`);
    if (res.ok) {
      const data = await res.json();
      const locality = data.locality || data.city || '';
      const principalSubdivision = data.principalSubdivision || '';
      
      let district = locality;
      let province = principalSubdivision;

      if (!district && !province) {
        district = DEFAULT_COORDS.district;
        province = DEFAULT_COORDS.province;
      }

      const locationName = district && province ? `${district}, ${province}` : (district || province || DEFAULT_COORDS.locationName);
      return { locationName, district: district || DEFAULT_COORDS.district, province: province || DEFAULT_COORDS.province };
    }
  } catch (err) {
    console.warn('Reverse geocoding error:', err);
  }
  return {
    locationName: DEFAULT_COORDS.locationName,
    district: DEFAULT_COORDS.district,
    province: DEFAULT_COORDS.province
  };
}

/**
 * Fetch real-time weather from Open-Meteo
 */
export async function fetchCurrentWeather(): Promise<WeatherData> {
  const { latitude, longitude, isGps } = await getDeviceCoordinates();

  // Reverse geocode in parallel with weather fetch
  const [geoInfo, weatherRes] = await Promise.all([
    reverseGeocode(latitude, longitude),
    fetch(
      `https://api.open-meteo.com/v1/forecast?latitude=${latitude}&longitude=${longitude}&current=temperature_2m,relative_humidity_2m,apparent_temperature,is_day,precipitation,weather_code,wind_speed_10m&hourly=temperature_2m,weather_code,precipitation_probability&daily=weather_code,temperature_2m_max,temperature_2m_min,precipitation_probability_max&timezone=auto`
    )
  ]);

  if (!weatherRes.ok) {
    throw new Error('Failed to fetch weather data');
  }

  const data = await weatherRes.json();
  const current = data.current;
  const isDay = current.is_day === 1;
  const details = getWeatherDetails(current.weather_code, isDay);

  // Parse next 6 hours
  const hourlyForecast: WeatherData['hourlyForecast'] = [];
  if (data.hourly && data.hourly.time) {
    const currentHourIndex = new Date().getHours();
    for (let i = currentHourIndex; i < Math.min(currentHourIndex + 6, data.hourly.time.length); i++) {
      const rawTime = data.hourly.time[i];
      const hourStr = rawTime ? `${new Date(rawTime).getHours()}:00` : `${i % 24}:00`;
      hourlyForecast.push({
        time: hourStr,
        temp: Math.round(data.hourly.temperature_2m?.[i] ?? current.temperature_2m),
        weatherCode: data.hourly.weather_code?.[i] ?? current.weather_code,
        precipitationProb: data.hourly.precipitation_probability?.[i] ?? 0
      });
    }
  }

  // Parse next 5 days
  const dayNamesTh = ['อา.', 'จ.', 'อ.', 'พ.', 'พฤ.', 'ศ.', 'ส.'];
  const dailyForecast: WeatherData['dailyForecast'] = [];
  if (data.daily && data.daily.time) {
    for (let i = 0; i < Math.min(5, data.daily.time.length); i++) {
      const d = new Date(data.daily.time[i]);
      const dayName = i === 0 ? 'วันนี้' : dayNamesTh[d.getDay()];
      dailyForecast.push({
        date: data.daily.time[i],
        dayNameTh: dayName,
        maxTemp: Math.round(data.daily.temperature_2m_max?.[i] ?? current.temperature_2m),
        minTemp: Math.round(data.daily.temperature_2m_min?.[i] ?? current.temperature_2m - 5),
        weatherCode: data.daily.weather_code?.[i] ?? current.weather_code,
        precipitationProb: data.daily.precipitation_probability_max?.[i] ?? 0
      });
    }
  }

  return {
    latitude,
    longitude,
    locationName: geoInfo.locationName,
    district: geoInfo.district,
    province: geoInfo.province,
    isGps,
    temperature: Math.round(current.temperature_2m),
    apparentTemperature: Math.round(current.apparent_temperature),
    humidity: Math.round(current.relative_humidity_2m),
    windSpeed: Math.round(current.wind_speed_10m),
    precipitation: current.precipitation ?? 0,
    weatherCode: current.weather_code,
    weatherDescriptionTh: details.th,
    weatherDescriptionEn: details.en,
    isDay,
    updatedAt: new Date().toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit' }),
    hourlyForecast,
    dailyForecast
  };
}

/**
 * Generate Google Weather Search URL directly to the detected place
 */
export function getGoogleWeatherUrl(weather: WeatherData): string {
  const query = weather.isGps
    ? `สภาพอากาศ ${weather.district || weather.locationName || `${weather.latitude},${weather.longitude}`}`
    : 'สภาพอากาศ ลาดกระบัง กรุงเทพมหานคร';
  return `https://www.google.com/search?q=${encodeURIComponent(query)}`;
}
