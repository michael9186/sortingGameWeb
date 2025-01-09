import { CommonModule } from '@angular/common';
import { Component, OnInit, ViewChild, ElementRef } from '@angular/core';
import { AnimationController, AlertController, IonHeader, IonFooter, IonToolbar, IonButtons, IonMenuButton, IonTitle, IonContent, IonCard, IonGrid, IonRow, IonCol, IonButton, IonIcon} from '@ionic/angular/standalone';
import { SharedService } from '../shared.service';
import { Card } from '../classes/card';
import { Action } from '../classes/action';
import confetti from 'canvas-confetti';
import { HttpClient } from '@angular/common/http';

@Component({
  selector: 'app-home',
  templateUrl: './home.page.html',
  styleUrls: ['./home.page.scss'],
  standalone: true,
  imports: [CommonModule, IonHeader, IonFooter, IonToolbar, IonButtons, IonMenuButton, IonTitle, IonContent, IonCard, IonGrid, IonRow, IonCol, IonButton, IonIcon],
})
export class HomePage implements OnInit {
  @ViewChild('cardContainer') cardContainer!: ElementRef;

  constructor(private sharedService: SharedService, private animationControl: AnimationController, private alertController: AlertController, private http: HttpClient,) {}


  //Parameters chosen by the user
  public selectedMode = this.sharedService.gameModes[0].id;
  public selectedNumberOfCards = this.sharedService.numberOfCards.min;
  public selectedValueType = this.sharedService.valueTypes[0].id;
  public selectedValueDistribution = this.sharedService.valueDistributions[0].id;
  public selectedWorkshopMode = this.sharedService.workshopModes[0].id;

  //Game variables
  public cards: Card[] = [];
  private originalCards: Card[] = [];
  public actions: Action[] = [];

  //put this in funciton, remove as class variable
  //public pinnedCard: number = -1;

  //Tracking variables
  public comparisons: number = 0;
  public swaps: number = 0;
  public errors: number = 0;
  //used to track the number of finalized cards to check if the game is finished
  private numberofFinalizedCards: number = 0;
  private startTime: number = Date.now();
  private finishTime: number = 0;
  
  //Grid variables
  public topRowCount: number = 0;

  public insertionSortCurrentIndex: number = 1;
  
  //Other variables+
  //used to disable flipping a card while the animation is running (doesnt really make sense + caused a bug that would sometimes allow the user to open a third card)
  private disableFlipping: boolean = false;

  private playerName: string = '';
  private baseUrl = 'https://cardgame.oida.synology.me';

  ngOnInit() {
    this.subscribeToSharedService();
  }

  private subscribeToSharedService() {
    this.sharedService.selectedMode$.subscribe((value) => {
      this.selectedMode = value;
      this.restartGame(false);
    });

    this.sharedService.selectedNumberOfCards$.subscribe((value) => {
      this.selectedNumberOfCards = value;
      this.restartGame(false);
    });

    this.sharedService.selectedValueType$.subscribe((value) => {
      this.selectedValueType = value;
      this.restartGame(false);
    });

    this.sharedService.selectedValueDistribution$.subscribe((value) => {
      this.selectedValueDistribution = value;
      this.restartGame(false);
    });
    this.sharedService.selectedWorkshopModes$.subscribe((value) => {
      this.selectedWorkshopMode = value;
    });
  }

  launchConfetti() {
    let times = 1;
    if(this.errors === 0){
      times = 3;
    }
    for (let i = 0; i < times; i++) {
      setTimeout(() => {
        confetti({
          particleCount: 300,
          spread: 180,
          startVelocity: 20,
          origin: { x: 0.5, y: 1.5 },
          decay: 0.96,
          gravity: 0.3,
        });
      }, i * 700);
    }
  }

  private generateCards(){
    this.originalCards = [];
    const uniqueValues = new Set<string>();
   
    for (let i = 0; i < this.selectedNumberOfCards; i++) {
      this.originalCards.push(new Card(i, this.getCardValue(uniqueValues), false, false, false));
    }

    /*
    //manually generate cards for edge case testing
    this.originalCards = [];
    this.originalCards.push(new Card(0, '4', false, false, false));
    this.originalCards.push(new Card(1, '5', false, false, false));
    this.originalCards.push(new Card(2, '1', false, false, false));
    this.originalCards.push(new Card(3, '2', false, false, false));
    this.originalCards.push(new Card(4, '3', false, false, false));
    */
    
    //Create Deep Copy of Cards to restore when user presses "Zurücksetzen"
    this.cards = structuredClone(this.originalCards);
    
    this.calculateRowDistribution();
    //this.colSize = Math.max(2,(12/this.selectedNumberOfCards)).toString();
    this.generateActions();
  }

  private getCardValue(uniqueValues: Set<string>): string {
    let value: string;
    //numbers
    if (this.selectedValueType === 0) {
      //small values
      if(this.selectedValueDistribution === 0){
        do {
          value = (Math.floor(Math.random() * this.selectedNumberOfCards) + 1).toString();
        } while (uniqueValues.has(value));
      //random values
      } else {
        do {
          value = Math.floor(Math.random() * 100).toString();
        } while (uniqueValues.has(value));        
      }      
    //chars
    } else {
      //small values
      if(this.selectedValueDistribution === 0){
        do {
          value = String.fromCharCode(Math.floor(Math.random() * this.selectedNumberOfCards) + 65);
        } while (uniqueValues.has(value));      
      //random values
      } else {
        do {
          value = String.fromCharCode(65 + Math.floor(Math.random() * 26));
        } while (uniqueValues.has(value)); 
      }
    }
    uniqueValues.add(value);
    return value; 
  }

  private checkAction(action: string, index: number | [number, number]): boolean {
    if(this.selectedMode === 0){
      return true;
    } else {
      let returnValue = false;
      const nextAction = this.actions[0];
      if(nextAction && nextAction.type === action){
        let filteredIds: number[] | [number, number][] = [];

        if(nextAction.type === 'swap' ){
          const sortedIndizes = [...index as [number, number]].sort();
          returnValue = (nextAction.ids as [number, number][]).some(tuple => {
            const sortedTuple = tuple.sort();
            let result =  sortedTuple[0] === sortedIndizes[0] && sortedTuple[1] === sortedIndizes[1];
            if(!result){
              (filteredIds as [number, number][]).push(tuple);
            }
            return result;
          });
        } else {
          filteredIds = (nextAction.ids as number[]).filter(id => id !== index);
          returnValue = (nextAction.ids as number[]).includes(index as number);
        }

        if(filteredIds.length > 0){
          nextAction.ids = filteredIds;
        } else {
          this.actions.shift();
        }
        if(!returnValue){
          this.presentMistakeAlert(nextAction.type, nextAction.ids as number[]);
        }
        return returnValue;
        
      } else {
        if(nextAction){ 
          this.presentMistakeAlert(nextAction.type, nextAction.ids as number[]);
        }
        return false;
      }
    }
  }

  async presentMistakeAlert(type: string, ids: number[] | [number, number][]) { 
    let text = '';
    if(type === 'open'){
      for(let i = 0; i < ids.length; i++){
        text += 'Die Karte an Position [' + (ids[i] as number + 1) + '] muss geöffnet werden. </br> ';
      }
    } else if(type === 'checkmark'){
      for(let i = 0; i < ids.length; i++){
        text += 'Die Karte an Position [' + (ids[i] as number + 1) + '] muss als gelöst markiert werden. </br> ';
      }
    } else if(type === 'swap'){
      for(let i = 0; i < ids.length; i++){
        text += 'Die offenen Karten müssen getauscht werden. </br>';
      }
    } else if(type === 'pin'){
      for(let i = 0; i < ids.length; i++){
        text += 'Die Karte an Position [' + (ids[i] as number + 1) + '] muss festgetackert werden. </br> ';
      }
    }

    let title = "Folgende Aktion ist erlaubt:";
    if(ids.length > 1){
      title = "Folgende Aktionen sind erlaubt:";
    }

    const alert = await this.alertController.create({
      header: title,
      message: text,
      buttons: ['Ok'],
    });

    await alert.present();
  }

  async presentFinishedAlert() {
    let duration = (this.finishTime - this.startTime) / 1000;
    let text =  'Sortieralgorithmus: '+ this.sharedService.gameModes.find(mode => mode.id === this.selectedMode)?.title + '<br> Zeit: ' + duration.toFixed(2) + ' Sekunden';;

    if(this.selectedWorkshopMode === 0){
      const alert = await this.alertController.create({
        header: 'Herzlichen Glückwunsch!',
        subHeader: 'Du hast das Spiel erfolgreich gelöst!',
        message: text,       
        buttons: ['Ok'],
      });
      await alert.present();
    } else {
      const alert = await this.alertController.create({
        header: 'Herzlichen Glückwunsch!',
        subHeader: 'Du hast das Spiel erfolgreich gelöst!',
        message: text,
        backdropDismiss: false,
        inputs: [{
          name: 'name',
          type: 'text',
          value: this.playerName,
          placeholder: 'Dein Name'
        }],
        buttons: [{
          text: 'Abbrechen',
          role: 'cancel',
        },
        {
          text: 'Senden',
          handler: (data) => {
            this.playerName = data.name;
            let payload = { name: data.name, comparisons: this.comparisons, swaps: this.swaps, errors: this.errors, time: duration, mode: this.sharedService.gameModes.find(mode => mode.id === this.selectedMode)?.title, numberofcards: this.selectedNumberOfCards, valuetype: this.sharedService.valueTypes.find(type => type.id === this.selectedValueType)?.title, valuedistribution: this.sharedService.valueDistributions.find(distribution => distribution.id === this.selectedValueDistribution)?.title};
            this.http.post(this.baseUrl + '/submission', payload).subscribe((response) => {
              console.log(response);
            });
          }  
        }
        ],
      });
      await alert.present();
    }
  }

  async presentUnsortedCardsAlert(incorrectCards: number[]) {
    let text = '';
    console.log(incorrectCards);
    for(let i = 0; i < incorrectCards.length; i++){
      text += 'Die Karte an Position [' + (incorrectCards[i] + 1) + '] ist nicht an der richtigen Stelle. </br>';
    }
    const alert = await this.alertController.create({
      header: 'Folgende Fehler wurden gefunden:',
      message: text,
      buttons: ['Ok'],
    });

    await alert.present();
  }



  flipCard(index: number) {
    if(this.disableFlipping){
      return;
    }
    if(!this.checkAction('open', index)){
      this.errors++;;
      return;
    }

    if(!(this.cards[index].finalized)){
      /**
       * Opening a closed card:
       * if less than 2 cards are open:
       *  -> open the clicked card
       *  -> if 2 cards are now open: increment comparisons
       * if 2 cards are open:
       *  -> if one of them is the pinned card:
       *    -> close both and open the clicked card and the pinned card, increment comparisons
       *  -> if none of them is the pinned card:
       *    -> close both and open the clicked card
       */
      this.insertionSortCurrentIndex = Math.max(index+1, this.insertionSortCurrentIndex);
      let selectedCardIndizes = this.getSelectedCardIndizes();
      let pinnedCardIndex = this.getPinnedCardIndex();
      if(!(this.cards[index].selected)){
        if(selectedCardIndizes.size < 2){
          this.cards[index].selected = true;
          if(selectedCardIndizes.size == 1) {
            this.comparisons++;
          }
        } else {
          if(selectedCardIndizes.has(pinnedCardIndex)){
            this.unflipCards();
            this.cards[pinnedCardIndex].selected = true;
            this.cards[index].selected = true;
            this.comparisons++;
          } else{
            this.unflipCards();
            this.cards[index].selected = true;
          }
          
        }
      /**
       * Closing an open card:
       * if only one card is open 
       *   -> if it is the pinned card:
       *     -> dont do anything
       *   -> if it is not the pinned card:
       *     -> close it
       * if two cards are open 
       *   -> if one of them is the pinned card:
       *     -> close the other card
       *   -> if none of them is the pinned card:
       *     -> close both and reopen the clicked card
       * 
       */ 
      } else { //only 1 card is open
        if(selectedCardIndizes.size == 1){ 
          if(!selectedCardIndizes.has(pinnedCardIndex)){
            this.unflipCards();
          }
        } else { //2 cards are open
          if(selectedCardIndizes.has(pinnedCardIndex)){
            this.unflipCards();
            this.cards[pinnedCardIndex].selected = true;
          } else {
            this.unflipCards();
            this.cards[index].selected = true;
          }
        }
      }
    }

    
  }

  //event.stopPropagation() prevents flipCard from being called when a button on the card is clicked
  finalizeCard(event: MouseEvent, index: number){
    event.stopPropagation();
    if(!this.checkAction('checkmark', index)){
      this.errors++;
      return;
    }

    
    if(this.cards[index].finalized){
      this.cards[index].finalized = false;
      this.numberofFinalizedCards--;
    } else {
      this.cards[index].finalized = true;
      this.numberofFinalizedCards++;
    }

    this.unpinCard();
    this.unflipCards();

    if(this.numberofFinalizedCards === this.cards.length){
      let incorrectCards: number[] = [];
      
      //if game mode is "Free Play" (0), we have to manually check if the cards are sorted, in the other modes it is not possible to finalize all cards unless they are sorted
      if(this.selectedMode === 0){
        let sortedCards = this.originalCards.map(card => card.value).sort();
        for(let i = 0; i < this.cards.length; i++){
          if(this.cards[i].value != sortedCards[i]){
            incorrectCards.push(i);
          }
        }
      }
      if(incorrectCards.length > 0){
        this.presentUnsortedCardsAlert(incorrectCards);
      } else {
        this.finishTime = Date.now();
        this.launchConfetti();
        this.presentFinishedAlert();
      }

      
    }
  }

  //event.stopPropagation() prevents flipCard from being called when a button on the card is clicked
  //if pinned card is clicked again, unpin it
  //if another card is pinned, unpin it and pin the clicked card
  //if no card is pinned, pin the clicked card
  pinCard(event: MouseEvent, index: number){
    event.stopPropagation();
    if(!this.checkAction('pin', index)){
      this.errors++;;
      return;
    }
    let pinnedCardIndex = this.getPinnedCardIndex();
    if(pinnedCardIndex == index){
      this.unpinCard();
      return;
    } else if(pinnedCardIndex >= 0 && pinnedCardIndex < this.cards.length){
      this.cards[pinnedCardIndex].pinned = false;
    }
    this.cards[index].pinned = true;
  }

  //get opened cards from set and swap them, then hide and unpin them
  async swapCards() {
    const [index1, index2] = [...this.getSelectedCardIndizes()];
    if(!this.checkAction('swap', [index1, index2])){
      this.errors++;;
      return;
    }

    const card1 = this.cardContainer.nativeElement.querySelector('#card-' + index1);
    const card2 = this.cardContainer.nativeElement.querySelector('#card-' + index2);
    //const card1 = document.getElementById('card-' + index1);
    //const card2 = document.getElementById('card-' + index2);
    
    const card1Rect = card1?.getBoundingClientRect();
    const card2Rect = card2?.getBoundingClientRect();
    
    if(card1 && card2 && card1Rect && card2Rect){
      this.disableFlipping = true;
      //this.unflipCards();
      this.unpinCard();
      const card1Animation = this.animationControl.create()
        .addElement(card1)
        .duration(500)
        .to('transform', `translate(${card2Rect.left - card1Rect.left}px, ${card2Rect.top - card1Rect.top}px)` );

      const card2Animation = this.animationControl.create()
        .addElement(card2)
        .duration(500)
        .to('transform', `translate(${card1Rect.left - card2Rect.left}px, ${card1Rect.top - card2Rect.top}px)` );

      await Promise.all([card1Animation.play(), card2Animation.play()]);

      this.unflipCards();

      const card1Return = this.animationControl.create()
        .addElement(card1)
        .duration(0)
        .to('transform', 'translate(0, 0)' );

      const card2Return = this.animationControl.create()
        .addElement(card2)
        .duration(0)
        .to('transform', 'translate(0, 0)' );
      await Promise.all([card1Return.play(), card2Return.play()]);

      this.disableFlipping = false;
      //swap cards in array
      [this.cards[index1], this.cards[index2]] = [this.cards[index2], this.cards[index1]];
      this.swaps++;
      
    }else{
      //It should not be possible for this to occur since the button is deactivated unless exactly 2 cards are open.
      console.log("Cards not found");
    } 
  }

  restartGame(keepCards: boolean) {
    this.resetTrackingStatistics();
    
    if (keepCards){
      this.cards = structuredClone(this.originalCards);
      this.generateActions();
      this.unpinCard();
    } else {
      this.generateCards();
      this.unpinCard();
    }
  }
 

  private unflipCards() {
    this.getSelectedCardIndizes().forEach(index => this.cards[index].selected = false);
  }

  private unpinCard(){
    let pinnedCardIndex = this.getPinnedCardIndex();
    if(pinnedCardIndex >= 0 && pinnedCardIndex < this.cards.length){
      this.cards[pinnedCardIndex].pinned = false; 
    }
  }

  getPinButtonIcon(index: number): string {
    if(this.cards[index].pinned){
      return 'radio-button-on';
    } else {
      return 'radio-button-off';
    }
  }

  private resetTrackingStatistics() {
    this.comparisons = 0;
    this.swaps = 0;
    this.errors = 0;
    this.insertionSortCurrentIndex = 1;
    this.numberofFinalizedCards = 0;
    this.startTime = Date.now();
  }

  getSelectedCardIndizes() {
    let selectedCardIndizes: Set<number> = new Set<number>();
    this.cards.forEach((card, index) => {
      if(card.selected){
        selectedCardIndizes.add(index);
      }
    });
    return selectedCardIndizes;
  }

  private getPinnedCardIndex() {
    return this.cards.findIndex(card => card.pinned);
  }

  private calculateRowDistribution() {
    const totalCols = this.cards.length;
    if (totalCols <= 6) {
      this.topRowCount = totalCols;
    } else {
      this.topRowCount = Math.ceil(totalCols / 2); 
    }
    document.documentElement.style.setProperty('--top-row-count', this.topRowCount.toString());
  }

  private generateActions() {
    this.actions = [];
    if(this.selectedMode === 1){
      this.actions = this.generateBubbleSortActions();
    } else if(this.selectedMode === 2){
      this.actions = this.generateInsertionSortActions();
    } else if(this.selectedMode === 3){ 
      this.actions = this.generateSelectionSortActions();
    }
  }

  private generateBubbleSortActions() {
    const actions: Action[] = [];
    const cardValues = this.getCardValues();
    let n = this.cards.length - 1;
    let swapped: boolean;
    
    do {
      swapped = false;
      for (let i = 0; i < n; i++) {
        actions.push({ type: 'open', ids: [i, i + 1] });
        if (cardValues[i] > cardValues[i + 1]) {
          actions.push({ type: 'swap', ids: [[i, i + 1]] });
          [cardValues[i], cardValues[i + 1]] = [cardValues[i + 1], cardValues[i]];
          swapped = true;
        }
      }
      n--;
      actions.push({ type: 'checkmark', ids: [n + 1] });
    } while (swapped);
  
    // checkmark all cards
    while (n >= 0) {
      actions.push({ type: 'checkmark', ids: [n] });
      n--;
    }
    return this.compressActions(actions);
  }

  private generateInsertionSortActions(){
    const actions: Action[] = [];

    const cardValues = this.getCardValues();
    let n = this.cards.length;

    for (let i = 1; i < n; i++) {
      let key = cardValues[i];
      let j = i - 1;
      actions.push({ type: 'open', ids: [i, j] });

      while (cardValues[j] > key && j >= 0) {
        actions.push({ type: 'swap', ids: [[j, j + 1]] });
        cardValues[j + 1] = cardValues[j];
        j--;
        if (j >= 0) {
          actions.push({ type: 'open', ids: [j, j+1] });
        }
      }
      cardValues[j + 1] = key;
    }
    //checkmark from left to right
    for (let i = 0; i < n; i++) {
      actions.push({ type: 'checkmark', ids: [i] });
    }

    return this.compressActions(actions);
  }

  private generateSelectionSortActions(){
    const actions: Action[] = [];
    const cardValues = this.getCardValues();
    let n = cardValues.length;
    let minIdx = 0;
    let lastPin = -1;
    let secondToLastOpen = -1;
    let lastOpen = -1;

    for (let i = 0; i < n - 1; i++) {
      actions.push({ type: 'open', ids: [i] });
      lastPin = -1;
      secondToLastOpen = lastOpen;
      lastOpen = i;
      for (let j = i + 1; j < n; j++) {
        actions.push({ type: 'open', ids: [j] });
        if(lastPin !== -1){
          secondToLastOpen = lastPin;
        } else {
          secondToLastOpen = lastOpen;
        }
        lastOpen = j;
        if (j === i + 1) {
          if (cardValues[i] <= cardValues[j]) {
            minIdx = i;
          } else {
            minIdx = j;
          }
          actions.push({ type: 'pin', ids: [minIdx] });
          lastPin = minIdx;
        } else {
          if (cardValues[minIdx] > cardValues[j]) {
            minIdx = j;
            actions.push({ type: 'pin', ids: [minIdx] });
            lastPin = minIdx;
          }
        }
      }

      //swap 45123
      if (minIdx !== i) {
        if(lastOpen !== i && secondToLastOpen !== i){
          actions.push({ type: 'open', ids: [i]});
        }
        
        actions.push({ type: 'swap', ids: [[i, minIdx]] });
        [cardValues[i], cardValues[minIdx]] = [cardValues[minIdx], cardValues[i]];
      }
      actions.push({ type: 'checkmark', ids: [i] });
    }

    actions.push({ type: 'checkmark', ids: [n - 1]});
    return this.compressActions(actions);
  }

  private compressActions(actions: Action[]) {
    const compressedActions: Action[] = [];
    for (let i = 0; i < actions.length; i++) {
      const currentAction = actions[i];

      // If the current action is of type 'checkmark' and the previous action is also 'checkmark', merge the 'ids' arrays
      if (currentAction.type === 'checkmark') {
          // Check if the last compressed action was also 'checkmark', if so add the current 'ids' to the last action instead of adding a new action
          const lastAction = compressedActions[compressedActions.length - 1];
          
        if (lastAction && lastAction.type === 'checkmark') {
            lastAction.ids = [...(lastAction.ids as number[]), ...(currentAction.ids as number[])];
        } else {
            compressedActions.push(currentAction);
        }
      } else if(this.selectedMode === 3 && currentAction.type === 'open'){
        // In Selection Sort, two 'open' actions can be compressed into one if they are consecutive, but only if there was a swap between them and the last pin. (I think (maybe screenshot in paper of what happens if this is not the case)...)
        const lastAction = compressedActions[compressedActions.length - 1];
        const lastPinIndex = this.findLastIndex(compressedActions, action => action.type === 'pin');
        const lastSwapIndex = this.findLastIndex(compressedActions, action => action.type === 'swap');
        
        if (lastAction && lastAction.type === 'open' && lastSwapIndex >= lastPinIndex) {
          lastAction.ids = [...(lastAction.ids as number[]), ...(currentAction.ids as number[])];
        } else {
          compressedActions.push(currentAction);
        }
      } else {
        compressedActions.push(currentAction);
      }                              
    }
    return compressedActions;
  }
  
  //returns the values of the cards, either as numbers or strings depending on the selectedValueType
  private getCardValues(){
    if(this.selectedValueType === 0){
      return this.cards.map(card => Number(card.value));
    } else {
      return this.cards.map(card => card.value);
    }
  }


  private findLastIndex<T>(array: T[], predicate: (value: T, index: number, obj: T[]) => boolean): number {
    for (let i = array.length - 1; i >= 0; i--) {
      if (predicate(array[i], i, array)) {
        return i;
      }
    }
    return -1;
  }
}


