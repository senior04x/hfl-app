// Data Validation Utilities for HFL Mobile App
// Validates data before caching and syncing

export interface ValidationResult {
  isValid: boolean;
  errors: string[];
  data?: any;
}

export class DataValidator {
  // Validate team data
  static validateTeam(team: any): ValidationResult {
    const errors: string[] = [];
    
    if (!team) {
      return { isValid: false, errors: ['Team data is null or undefined'] };
    }
    
    if (!team.id || typeof team.id !== 'string') {
      errors.push('Team ID is required and must be a string');
    }
    
    if (!team.name || typeof team.name !== 'string') {
      errors.push('Team name is required and must be a string');
    }
    
    if (!team.shortName || typeof team.shortName !== 'string') {
      errors.push('Team short name is required and must be a string');
    }
    
    if (team.colors && (!team.colors.primary || !team.colors.secondary)) {
      errors.push('Team colors must have primary and secondary colors');
    }
    
    return {
      isValid: errors.length === 0,
      errors,
      data: errors.length === 0 ? team : null
    };
  }

  // Validate match data
  static validateMatch(match: any): ValidationResult {
    const errors: string[] = [];
    
    if (!match) {
      return { isValid: false, errors: ['Match data is null or undefined'] };
    }
    
    if (!match.id || typeof match.id !== 'string') {
      errors.push('Match ID is required and must be a string');
    }
    
    if (!match.homeTeamId || typeof match.homeTeamId !== 'string') {
      errors.push('Home team ID is required and must be a string');
    }
    
    if (!match.awayTeamId || typeof match.awayTeamId !== 'string') {
      errors.push('Away team ID is required and must be a string');
    }
    
    if (match.homeScore !== undefined && (typeof match.homeScore !== 'number' || match.homeScore < 0)) {
      errors.push('Home score must be a non-negative number');
    }
    
    if (match.awayScore !== undefined && (typeof match.awayScore !== 'number' || match.awayScore < 0)) {
      errors.push('Away score must be a non-negative number');
    }
    
    if (match.date && !this.isValidDate(match.date)) {
      errors.push('Match date must be a valid date');
    }
    
    return {
      isValid: errors.length === 0,
      errors,
      data: errors.length === 0 ? match : null
    };
  }

  // Validate player data
  static validatePlayer(player: any): ValidationResult {
    const errors: string[] = [];
    
    if (!player) {
      return { isValid: false, errors: ['Player data is null or undefined'] };
    }
    
    if (!player.id || typeof player.id !== 'string') {
      errors.push('Player ID is required and must be a string');
    }
    
    if (!player.name || typeof player.name !== 'string') {
      errors.push('Player name is required and must be a string');
    }
    
    if (!player.phone || typeof player.phone !== 'string') {
      errors.push('Player phone is required and must be a string');
    }
    
    if (player.phone && !this.isValidPhone(player.phone)) {
      errors.push('Player phone must be a valid phone number');
    }
    
    if (player.teamId && typeof player.teamId !== 'string') {
      errors.push('Player team ID must be a string');
    }
    
    return {
      isValid: errors.length === 0,
      errors,
      data: errors.length === 0 ? player : null
    };
  }

  // Validate standings data
  static validateStandings(standings: any): ValidationResult {
    const errors: string[] = [];
    
    if (!standings) {
      return { isValid: false, errors: ['Standings data is null or undefined'] };
    }
    
    if (!Array.isArray(standings)) {
      return { isValid: false, errors: ['Standings must be an array'] };
    }
    
    for (let i = 0; i < standings.length; i++) {
      const standing = standings[i];
      
      if (!standing.teamId || typeof standing.teamId !== 'string') {
        errors.push(`Standing ${i}: Team ID is required and must be a string`);
      }
      
      if (typeof standing.points !== 'number' || standing.points < 0) {
        errors.push(`Standing ${i}: Points must be a non-negative number`);
      }
      
      if (typeof standing.matchesPlayed !== 'number' || standing.matchesPlayed < 0) {
        errors.push(`Standing ${i}: Matches played must be a non-negative number`);
      }
    }
    
    return {
      isValid: errors.length === 0,
      errors,
      data: errors.length === 0 ? standings : null
    };
  }

  // Validate API response
  static validateApiResponse(response: any): ValidationResult {
    const errors: string[] = [];
    
    if (!response) {
      return { isValid: false, errors: ['API response is null or undefined'] };
    }
    
    if (typeof response !== 'object') {
      return { isValid: false, errors: ['API response must be an object'] };
    }
    
    if (response.success === undefined) {
      errors.push('API response must have success field');
    }
    
    if (response.success && !response.data) {
      errors.push('Successful API response must have data field');
    }
    
    if (!response.success && !response.error) {
      errors.push('Failed API response must have error field');
    }
    
    return {
      isValid: errors.length === 0,
      errors,
      data: errors.length === 0 ? response : null
    };
  }

  // Helper methods
  private static isValidDate(date: any): boolean {
    if (!date) return false;
    const parsedDate = new Date(date);
    return !isNaN(parsedDate.getTime());
  }

  private static isValidPhone(phone: string): boolean {
    // Uzbek phone number validation
    const phoneRegex = /^(\+998|998)?[0-9]{9}$/;
    return phoneRegex.test(phone.replace(/\s/g, ''));
  }

  // Validate array of data
  static validateArray<T>(
    data: any[],
    validator: (item: any) => ValidationResult,
    dataType: string
  ): ValidationResult {
    const errors: string[] = [];
    const validData: T[] = [];
    
    if (!Array.isArray(data)) {
      return { isValid: false, errors: [`${dataType} data must be an array`] };
    }
    
    for (let i = 0; i < data.length; i++) {
      const result = validator(data[i]);
      if (!result.isValid) {
        errors.push(`${dataType} ${i}: ${result.errors.join(', ')}`);
      } else {
        validData.push(result.data);
      }
    }
    
    return {
      isValid: errors.length === 0,
      errors,
      data: validData
    };
  }
}

export default DataValidator;
      errors.push('Match date must be a valid date');
    }
    
    return {
      isValid: errors.length === 0,
      errors,
      data: errors.length === 0 ? match : null
    };
  }

  // Validate player data
  static validatePlayer(player: any): ValidationResult {
    const errors: string[] = [];
    
    if (!player) {
      return { isValid: false, errors: ['Player data is null or undefined'] };
    }
    
    if (!player.id || typeof player.id !== 'string') {
      errors.push('Player ID is required and must be a string');
    }
    
    if (!player.name || typeof player.name !== 'string') {
      errors.push('Player name is required and must be a string');
    }
    
    if (!player.phone || typeof player.phone !== 'string') {
      errors.push('Player phone is required and must be a string');
    }
    
    if (player.phone && !this.isValidPhone(player.phone)) {
      errors.push('Player phone must be a valid phone number');
    }
    
    if (player.teamId && typeof player.teamId !== 'string') {
      errors.push('Player team ID must be a string');
    }
    
    return {
      isValid: errors.length === 0,
      errors,
      data: errors.length === 0 ? player : null
    };
  }

  // Validate standings data
  static validateStandings(standings: any): ValidationResult {
    const errors: string[] = [];
    
    if (!standings) {
      return { isValid: false, errors: ['Standings data is null or undefined'] };
    }
    
    if (!Array.isArray(standings)) {
      return { isValid: false, errors: ['Standings must be an array'] };
    }
    
    for (let i = 0; i < standings.length; i++) {
      const standing = standings[i];
      
      if (!standing.teamId || typeof standing.teamId !== 'string') {
        errors.push(`Standing ${i}: Team ID is required and must be a string`);
      }
      
      if (typeof standing.points !== 'number' || standing.points < 0) {
        errors.push(`Standing ${i}: Points must be a non-negative number`);
      }
      
      if (typeof standing.matchesPlayed !== 'number' || standing.matchesPlayed < 0) {
        errors.push(`Standing ${i}: Matches played must be a non-negative number`);
      }
    }
    
    return {
      isValid: errors.length === 0,
      errors,
      data: errors.length === 0 ? standings : null
    };
  }

  // Validate API response
  static validateApiResponse(response: any): ValidationResult {
    const errors: string[] = [];
    
    if (!response) {
      return { isValid: false, errors: ['API response is null or undefined'] };
    }
    
    if (typeof response !== 'object') {
      return { isValid: false, errors: ['API response must be an object'] };
    }
    
    if (response.success === undefined) {
      errors.push('API response must have success field');
    }
    
    if (response.success && !response.data) {
      errors.push('Successful API response must have data field');
    }
    
    if (!response.success && !response.error) {
      errors.push('Failed API response must have error field');
    }
    
    return {
      isValid: errors.length === 0,
      errors,
      data: errors.length === 0 ? response : null
    };
  }

  // Helper methods
  private static isValidDate(date: any): boolean {
    if (!date) return false;
    const parsedDate = new Date(date);
    return !isNaN(parsedDate.getTime());
  }

  private static isValidPhone(phone: string): boolean {
    // Uzbek phone number validation
    const phoneRegex = /^(\+998|998)?[0-9]{9}$/;
    return phoneRegex.test(phone.replace(/\s/g, ''));
  }

  // Validate array of data
  static validateArray<T>(
    data: any[],
    validator: (item: any) => ValidationResult,
    dataType: string
  ): ValidationResult {
    const errors: string[] = [];
    const validData: T[] = [];
    
    if (!Array.isArray(data)) {
      return { isValid: false, errors: [`${dataType} data must be an array`] };
    }
    
    for (let i = 0; i < data.length; i++) {
      const result = validator(data[i]);
      if (!result.isValid) {
        errors.push(`${dataType} ${i}: ${result.errors.join(', ')}`);
      } else {
        validData.push(result.data);
      }
    }
    
    return {
      isValid: errors.length === 0,
      errors,
      data: validData
    };
  }
}

export default DataValidator;