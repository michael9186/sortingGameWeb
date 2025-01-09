import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class SharedService {

  public gameModes = [
    { id: 0, title: 'Freies Spielen', icon: 'game-controller' },
    { id: 1, title: 'Bubble Sort', icon: 'swap-vertical' },
    { id: 2, title: 'Insertion Sort', icon: 'arrow-forward' },
    { id: 3, title: 'Selection Sort',  icon: 'checkmark' },
  ];

  public numberOfCards = {min: 6, max: 12};

  public valueTypes = [
    { id: 0, title: 'Zahlen'}, 
    { id: 1, title: 'Buchstaben' }
  ];

  public valueDistributions = [
    { id: 0, title: 'klein' }, 
    { id: 1, title: 'zufällig' }
  ];

  public workshopModes = [
    { id: 0, title: 'Standard' },
    { id: 1, title: 'Workshop' }
  ];

  private selectedModeSubject = new BehaviorSubject<any>(this.gameModes[0].id);
  private selectedNumberOfCardsSubject = new BehaviorSubject<any>(this.numberOfCards.min);
  private selectedValueTypeSubject = new BehaviorSubject<any>(this.valueTypes[0].id);
  private selectedValueDistributionSubject = new BehaviorSubject<any>(this.valueDistributions[0].id);
  private selectedWorkshopModeSubject = new BehaviorSubject<any>(this.workshopModes[0].id);

  public selectedMode$ = this.selectedModeSubject.asObservable();
  public selectedNumberOfCards$ = this.selectedNumberOfCardsSubject.asObservable();
  public selectedValueType$ = this.selectedValueTypeSubject.asObservable();
  public selectedValueDistribution$ = this.selectedValueDistributionSubject.asObservable();
  public selectedWorkshopModes$ = this.selectedWorkshopModeSubject.asObservable();

  setSelectedMode(value: number): void {
    this.selectedModeSubject.next(value);
  }

  setSelectedNumberOfCards(value: number): void {
    this.selectedNumberOfCardsSubject.next(value);
  }

  setSelectedValueType(value: number): void {
    this.selectedValueTypeSubject.next(value);
  }

  setSelectedValueDistribution(value: number): void {
    this.selectedValueDistributionSubject.next(value);
  }

  setSelectedWorkshopMode(value: number): void {
    this.selectedWorkshopModeSubject.next(value);
  }

  constructor() { }
}
