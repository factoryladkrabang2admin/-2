export interface AvatarPreset {
  id: string;
  name: string;
  url: string;
  gender?: 'female' | 'male' | 'abstract';
}

export const AVATAR_PRESETS: AvatarPreset[] = [
  {
    id: 'avatar-1',
    name: 'Sarah (Lead)',
    url: 'https://lh3.googleusercontent.com/aida-public/AB6AXuC1e-7yY1t1uMj2tJboSniZn3Kxxq1CXkTjbc9Itgw7wrd8acry1Nr5XdrlSVXHdKxtsnPxwZkyFF06xf0kAi4ceJOg38aURJ53kpzGQTXZ-ht-mK42jlC8pTP8NeDaBMgiXDSJe5pIYZz05ZDuSD9Ajm0zrIorHxQLNVxL_Ei8iZ9nPNsdkjuL8umQSMdhTxEkPlES0muxhJ1xnsNklhFIILjJpN_apVLvbOpVyJKZf8FMa-nZZ5qk7g',
    gender: 'female'
  },
  {
    id: 'avatar-2',
    name: 'David (Design)',
    url: 'https://lh3.googleusercontent.com/aida-public/AB6AXuBU5FWZqdtY7ly-q_IhU2uD2fIUj7WxESnecR_DSZxP54XOR4PmuVeTz0sYiUu9SpHboqq4ASkmkrkzYWsvpvcRJtu4xZuqZqISkvK8uNLLWQ50EtOM6WnnsVRN-rRKN_qWTZVeoPVK-DETyBbvWhKD8zNnzYlgiAmP2WccszG24VcVeUChFETVg81bHFOi74KjWeGxSaJ4kVsg4f_BvEnEz0G7W-enzLWV9EJsMtViouL_m5uay3LPmw',
    gender: 'male'
  },
  {
    id: 'avatar-3',
    name: 'Amanda (Data)',
    url: 'https://lh3.googleusercontent.com/aida-public/AB6AXuCh_XeAFLbzqsEG3UWc-4xebzYI68BWctgrYs8YqZ8f0B3yxkc3t75OAaiDUn02y1KZ-Z3Kwe0LTA7R7ZvUHoI2yc8RqD62jeDsFxVTWlEgrBfLitKpQlIZCuCzeAAV1tVaQcD9qn9cvSv2Zdw7fEPZZqPulwhdygqNIF1GIAXxc_0xw0Vwt3sapbA1-jpNmJh--eVAnl1uOBUzZjC7x3VvQWBwZZhim0TWayYQrmmaDkco7_wLvc2-yg',
    gender: 'female'
  },
  {
    id: 'avatar-4',
    name: 'Alex (Architect)',
    url: 'https://lh3.googleusercontent.com/aida-public/AB6AXuBp5uzL1HZMmlU7BQ6PgXarVkIc2qLG3ZozupvAHHKYCn7UX1wuz1d6jjp6e3_MxrAFCDl6yI8vOivNDVHVHO4vDjFoBAM4SPZ5ao7L-G42ApfhlHWTOz6Fm-cZdiLqI4DbGE8_8y9Qu1V4BLgyHHR3a8d9sU4nDmS6hoY0rqVUHyus7hXAF3JinDOAl8dhpn7kgIcQXjO0qziavBxNPlKsuo3iiAegHnhhJn2_DKWIG_mQ2b6OR4venw',
    gender: 'male'
  },
  {
    id: 'avatar-5',
    name: 'Super Admin',
    url: 'https://lh3.googleusercontent.com/aida-public/AB6AXuDOt7uGvM7wmf5FyO-ytN5B2czjD6OeErJex8aDUIDpl72UqJaUgpQfaKwWRSpBBzjRu4gAsjhusgGmHZm9g6t9aVD3bs7_mgf8oObnlh0NbODxTHwsRCVnTgFDwd0XYtaU8JZlMwOtbF3s-_FCLtlS_4aBgbj-qhh_zdVObgK8mipsHdILEFK0Re3I_6mmXj7KtInGyZSqx1BPvpDSvhTKBEnp_d1BfnmmDRak8EV0uYKwtLC6hF-yZA',
    gender: 'female'
  },
  {
    id: 'avatar-6',
    name: 'David Lee',
    url: 'https://lh3.googleusercontent.com/aida-public/AB6AXuAaCYV87c6mbKHpAp1o8_cMo9XnVILmPMMVNktPXlPFXAWl0HnUr5640SWelBe6qh_aDWAP_7SmJMuofA9_Fu7m4zasAYnHtqYHRX_cD53lhLxYYaTLV9ii7uz7O21TI_HDyFJD56WbPilOB8JEuYAKgzmLBYKUQX1a7am0Swc8oVOxXP-NSFp9zFblM-k7vUO8E4UKRhfWHJYOWeoKkQzPnuaUEzT66nQ5O7bwic8kbLG7Jz0-C2Dv5A',
    gender: 'male'
  }
];
