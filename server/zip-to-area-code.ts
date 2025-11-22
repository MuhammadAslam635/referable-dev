/**
 * ZIP code to area code mapping service
 * Maps ZIP codes to their primary and secondary area codes for local number assignment
 */

interface AreaCodeMapping {
  zip: string;
  primary: string[];
  secondary: string[];
}

// Sample mappings for major US metro areas
const zipToAreaCodeMap: Record<string, string[]> = {
  // New York Metro
  "10001": ["212", "646", "917"],
  "10002": ["212", "646", "917"],
  "10003": ["212", "646", "917"],
  "11201": ["718", "347", "929"],
  "11202": ["718", "347", "929"],
  
  // Los Angeles Metro
  "90210": ["310", "424"],
  "90211": ["310", "424"],
  "90028": ["323", "213"],
  "90068": ["323", "213"],
  
  // Chicago Metro
  "60601": ["312", "773", "872"],
  "60602": ["312", "773", "872"],
  "60610": ["312", "773", "872"],
  
  // Houston Metro
  "77001": ["713", "281", "832"],
  "77002": ["713", "281", "832"],
  "77019": ["713", "281", "832"],
  
  // Phoenix Metro
  "85001": ["602", "623", "480"],
  "85002": ["602", "623", "480"],
  "85281": ["480", "602", "623"],
  
  // Philadelphia Metro
  "19101": ["215", "267", "445"],
  "19102": ["215", "267", "445"],
  "19103": ["215", "267", "445"],
  
  // San Antonio Metro
  "78201": ["210", "726"],
  "78202": ["210", "726"],
  "78204": ["210", "726"],
  
  // San Diego Metro
  "92101": ["619", "858"],
  "92102": ["619", "858"],
  "92103": ["619", "858"],
  
  // Dallas Metro
  "75201": ["214", "469", "972"],
  "75202": ["214", "469", "972"],
  "75203": ["214", "469", "972"],
  
  // San Jose/Silicon Valley
  "95101": ["408", "669"],
  "95110": ["408", "669"],
  "95112": ["408", "669"],
  
  // Austin Metro
  "78701": ["512", "737"],
  "78702": ["512", "737"],
  "78703": ["512", "737"],
  
  // Jacksonville Metro
  "32201": ["904"],
  "32202": ["904"],
  "32204": ["904"],
  
  // Fort Worth Metro
  "76101": ["817", "682"],
  "76102": ["817", "682"],
  "76103": ["817", "682"],
  
  // Columbus Metro
  "43201": ["614", "380"],
  "43202": ["614", "380"],
  "43215": ["614", "380"],
  
  // Charlotte Metro
  "28201": ["704", "980"],
  "28202": ["704", "980"],
  "28204": ["704", "980"],
  
  // San Francisco Metro
  "94101": ["415", "628"],
  "94102": ["415", "628"],
  "94103": ["415", "628"],
  
  // Indianapolis Metro
  "46201": ["317"],
  "46202": ["317"],
  "46204": ["317"],
  
  // Seattle Metro
  "98101": ["206", "564"],
  "98102": ["206", "564"],
  "98103": ["206", "564"],
  
  // Denver Metro
  "80201": ["303", "720"],
  "80202": ["303", "720"],
  "80204": ["303", "720"],
  
  // Washington DC Metro
  "20001": ["202"],
  "20002": ["202"],
  "20003": ["202"],
  
  // Boston Metro
  "02101": ["617", "857"],
  "02102": ["617", "857"],
  "02108": ["617", "857"],
  
  // Nashville Metro
  "37201": ["615", "629"],
  "37203": ["615", "629"],
  "37204": ["615", "629"],
  
  // Oklahoma City Metro
  "73101": ["405", "572"],
  "73102": ["405", "572"],
  "73103": ["405", "572"],
  
  // Portland Metro
  "97201": ["503", "971"],
  "97202": ["503", "971"],
  "97205": ["503", "971"],
  
  // Las Vegas Metro
  "89101": ["702", "725"],
  "89102": ["702", "725"],
  "89104": ["702", "725"],
  
  // Louisville Metro
  "40201": ["502"],
  "40202": ["502"],
  "40203": ["502"],
  
  // Baltimore Metro
  "21201": ["410", "443", "667"],
  "21202": ["410", "443", "667"],
  "21230": ["410", "443", "667"],
  
  // Milwaukee Metro
  "53201": ["414", "262"],
  "53202": ["414", "262"],
  "53203": ["414", "262"],
  
  // Albuquerque Metro
  "87101": ["505", "575"],
  "87102": ["505", "575"],
  "87104": ["505", "575"],
  
  // Tucson Metro
  "85701": ["520", "928"],
  "85702": ["520", "928"],
  "85704": ["520", "928"],
  
  // Fresno Metro
  "93701": ["559"],
  "93702": ["559"],
  "93704": ["559"],
  
  // Sacramento Metro
  "95814": ["916", "279"],
  "95815": ["916", "279"],
  "95816": ["916", "279"],
  
  // Kansas City Metro
  "64101": ["816", "975"],
  "64102": ["816", "975"],
  "64105": ["816", "975"],
  
  // Mesa Metro (Phoenix area)
  "85201": ["480", "602", "623"],
  "85202": ["480", "602", "623"],
  "85203": ["480", "602", "623"],
  
  // Atlanta Metro
  "30301": ["404", "470", "678", "770"],
  "30302": ["404", "470", "678", "770"],
  "30303": ["404", "470", "678", "770"],
  
  // Virginia Beach Metro
  "23451": ["757"],
  "23452": ["757"],
  "23454": ["757"],
  
  // Omaha Metro
  "68101": ["402", "531"],
  "68102": ["402", "531"],
  "68104": ["402", "531"],
  
  // Colorado Springs Metro
  "80901": ["719"],
  "80902": ["719"],
  "80903": ["719"],
  
  // Raleigh Metro
  "27601": ["919", "984"],
  "27602": ["919", "984"],
  "27603": ["919", "984"],
  
  // Miami Metro
  "33101": ["305", "786"],
  "33102": ["305", "786"],
  "33109": ["305", "786"],
  
  // Long Beach Metro (LA area)
  "90801": ["562"],
  "90802": ["562"],
  "90803": ["562"],
  
  // Minneapolis Metro
  "55401": ["612", "651", "763", "952"],
  "55402": ["612", "651", "763", "952"],
  "55403": ["612", "651", "763", "952"],
  
  // Tulsa Metro
  "74101": ["918", "539"],
  "74102": ["918", "539"],
  "74103": ["918", "539"],
  
  // Oakland Metro (Bay Area)
  "94601": ["510", "341"],
  "94602": ["510", "341"],
  "94603": ["510", "341"],
  
  // Bakersfield Metro
  "93301": ["661"],
  "93302": ["661"],
  "93304": ["661"],
  
  // Wichita Metro
  "67201": ["316", "620"],
  "67202": ["316", "620"],
  "67203": ["316", "620"],
  
  // Arlington Metro (Dallas area)
  "76001": ["817", "682"],
  "76002": ["817", "682"],
  "76006": ["817", "682"],
  
  // New Orleans Metro
  "70112": ["504"],
  "70113": ["504"],
  "70115": ["504"],
  
  // Honolulu Metro
  "96801": ["808"],
  "96802": ["808"],
  "96813": ["808"],
  
  // Anaheim Metro (LA area)
  "92801": ["714", "657"],
  "92802": ["714", "657"],
  "92804": ["714", "657"],
  
  // Tampa Metro
  "33601": ["813", "656"],
  "33602": ["813", "656"],
  "33603": ["813", "656"],
  
  // Santa Ana Metro (LA area)
  "92701": ["714", "657"],
  "92702": ["714", "657"],
  "92703": ["714", "657"],
  
  // St. Louis Metro
  "63101": ["314", "636"],
  "63102": ["314", "636"],
  "63103": ["314", "636"],
  
  // Riverside Metro (LA area)
  "92501": ["951", "909"],
  "92502": ["951", "909"],
  "92503": ["951", "909"],
  
  // Corpus Christi Metro
  "78401": ["361"],
  "78404": ["361"],
  "78405": ["361"],
  
  // Lexington Metro
  "40507": ["859"],
  "40508": ["859"],
  "40509": ["859"],
  
  // Pittsburgh Metro
  "15201": ["412", "724", "878"],
  "15202": ["412", "724", "878"],
  "15203": ["412", "724", "878"],
  
  // Stockton Metro
  "95201": ["209"],
  "95202": ["209"],
  "95203": ["209"],
  
  // Cincinnati Metro
  "45201": ["513", "283"],
  "45202": ["513", "283"],
  "45203": ["513", "283"],
  
  // St. Paul Metro
  "55101": ["651", "612", "763", "952"],
  "55102": ["651", "612", "763", "952"],
  "55103": ["651", "612", "763", "952"],
  
  // Toledo Metro
  "43601": ["419", "567"],
  "43602": ["419", "567"],
  "43604": ["419", "567"],
  
  // Newark Metro (NYC area)
  "07101": ["973", "862"],
  "07102": ["973", "862"],
  "07103": ["973", "862"],
  
  // Greensboro Metro
  "27401": ["336", "743"],
  "27402": ["336", "743"],
  "27403": ["336", "743"],
  
  // Plano Metro (Dallas area)
  "75023": ["972", "214", "469"],
  "75024": ["972", "214", "469"],
  "75025": ["972", "214", "469"],
  
  // Henderson Metro (Las Vegas area)
  "89002": ["702", "725"],
  "89011": ["702", "725"],
  "89012": ["702", "725"],
  
  // Lincoln Metro
  "68501": ["402", "531"],
  "68502": ["402", "531"],
  "68503": ["402", "531"],
  
  // Buffalo Metro
  "14201": ["716", "585"],
  "14202": ["716", "585"],
  "14203": ["716", "585"],
  
  // Jersey City Metro (NYC area)
  "07301": ["201", "551"],
  "07302": ["201", "551"],
  "07304": ["201", "551"],
  
  // Chula Vista Metro (San Diego area)
  "91910": ["619", "858"],
  "91911": ["619", "858"],
  "91913": ["619", "858"],
  
  // Fort Wayne Metro
  "46801": ["260"],
  "46802": ["260"],
  "46803": ["260"],
  
  // Orlando Metro
  "32801": ["321", "407", "689"],
  "32802": ["321", "407", "689"],
  "32803": ["321", "407", "689"],
  
  // St. Petersburg Metro
  "33701": ["727"],
  "33702": ["727"],
  "33703": ["727"],
  
  // Chandler Metro (Phoenix area)
  "85224": ["480", "602", "623"],
  "85225": ["480", "602", "623"],
  "85226": ["480", "602", "623"],
  
  // Laredo Metro
  "78040": ["956"],
  "78041": ["956"],
  "78043": ["956"],
  
  // Norfolk Metro
  "23501": ["757"],
  "23502": ["757"],
  "23503": ["757"],
  
  // Durham Metro
  "27701": ["919", "984"],
  "27702": ["919", "984"],
  "27703": ["919", "984"],
  
  // Madison Metro
  "53701": ["608"],
  "53702": ["608"],
  "53703": ["608"],
  
  // Lubbock Metro
  "79401": ["806"],
  "79402": ["806"],
  "79403": ["806"]
};

/**
 * Gets area codes for a given ZIP code
 * @param zipCode - 5-digit ZIP code
 * @returns Array of area codes, with most common first
 */
export function getAreaCodesForZip(zipCode: string): string[] {
  // Remove any non-digits and take first 5 characters
  const cleanZip = zipCode.replace(/\D/g, '').substring(0, 5);
  
  if (cleanZip.length !== 5) {
    return [];
  }
  
  return zipToAreaCodeMap[cleanZip] || [];
}

/**
 * Gets all possible area codes for a business location
 * Combines preferred area code with ZIP-based area codes
 * @param preferredAreaCode - Business's preferred area code
 * @param zipCode - Business ZIP code
 * @returns Array of area codes in priority order
 */
export function getPriorityAreaCodes(preferredAreaCode?: string, zipCode?: string): string[] {
  const areaCodes: string[] = [];
  
  // Add preferred area code first if provided
  if (preferredAreaCode && preferredAreaCode.length === 3) {
    areaCodes.push(preferredAreaCode);
  }
  
  // Add ZIP-based area codes
  if (zipCode) {
    const zipAreaCodes = getAreaCodesForZip(zipCode);
    zipAreaCodes.forEach(code => {
      if (!areaCodes.includes(code)) {
        areaCodes.push(code);
      }
    });
  }
  
  return areaCodes;
}

/**
 * Validates if an area code is legitimate US area code
 * @param areaCode - 3-digit area code
 * @returns true if valid
 */
export function isValidAreaCode(areaCode: string): boolean {
  if (!areaCode || areaCode.length !== 3) {
    return false;
  }
  
  // Basic US area code validation
  const first = parseInt(areaCode[0]);
  const second = parseInt(areaCode[1]);
  
  // First digit: 2-9 (not 0 or 1)
  // Second digit: 0-9
  // Third digit: 0-9
  return first >= 2 && first <= 9 && second >= 0 && second <= 9;
}