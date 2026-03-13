import { useEffect, useState } from 'react';
import { createClient } from './supabase';

export type SiteSettings = {
  maintenance_mode: boolean;
  feature_image_to_video: boolean;
  feature_audio_ai: boolean;
  feature_create_image: boolean;
  site_name: string;
  site_tagline: string;
};

const DEFAULTS: SiteSettings = {
  maintenance_mode:       false,
  feature_image_to_video: true,
  feature_audio_ai:       false,
  feature_create_image:   false,
  site_name:              'Hmong Creative',
  site_tagline:           'AI Creative Studio',
};

export function useSiteSettings() {
  const [settings, setSettings] = useState<SiteSettings>(DEFAULTS);
  const [loading, setLoading]   = useState(true);

  useEffect(() => {
    const load = async () => {
      try {
        const supabase = createClient();
        const { data } = await supabase.from('site_settings').select('key, value');
        if (data) {
          const map: Record<string, string> = {};
          data.forEach(row => { map[row.key] = row.value; });
          setSettings({
            maintenance_mode:       map.maintenance_mode       === 'true',
            feature_image_to_video: map.feature_image_to_video !== 'false',
            feature_audio_ai:       map.feature_audio_ai       === 'true',
            feature_create_image:   map.feature_create_image   === 'true',
            site_name:              map.site_name               || 'Hmong Creative',
            site_tagline:           map.site_tagline            || 'AI Creative Studio',
          });
        }
      } catch(e) {
        console.error('Settings load error:', e);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  return { settings, loading };
}
