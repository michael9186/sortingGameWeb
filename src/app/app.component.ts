import { CommonModule } from '@angular/common';
import { Component } from '@angular/core';
import { IonApp, IonSplitPane, IonMenu, IonContent, IonItem, IonLabel, IonRouterOutlet, IonRadioGroup, IonRadio, IonTitle, IonRange, AlertController } from '@ionic/angular/standalone';
import { addIcons } from 'ionicons';
import * as ionIcons from 'ionicons/icons';
import { SharedService } from './shared.service';
import { HttpClient } from '@angular/common/http';
import { FormsModule } from '@angular/forms';
import { catchError } from 'rxjs/operators';
import { of } from 'rxjs';

@Component({
  selector: 'app-root',
  templateUrl: 'app.component.html',
  styleUrls: ['app.component.scss'],
  standalone: true,
  imports: [ CommonModule, IonApp, IonSplitPane, IonMenu, IonContent, IonItem, IonLabel, IonRouterOutlet, IonRadioGroup, IonRadio, IonTitle, IonRange, FormsModule],
  providers: [SharedService]
})
export class AppComponent {
  
  public gameModes = this.sharedService.gameModes;
  public numberOfCards = this.sharedService.numberOfCards;
  public valueTypes = this.sharedService.valueTypes;
  public valueDistributions = this.sharedService.valueDistributions;
  public workshopModes = this.sharedService.workshopModes;

  public selectedWorkshopMode = this.sharedService.workshopModes[0].id;


  private baseUrl = 'https://cardgame.oida.synology.me';
  
  constructor(private sharedService: SharedService, private http: HttpClient, private alertController: AlertController) {
    addIcons(ionIcons);
  }

  ngOnInit() {
    this.sharedService.selectedWorkshopModes$.subscribe((value) => {
      this.selectedWorkshopMode = value;
    });
  }

  handleModeChange(ev: any) {
    //console.log('Current value:', JSON.stringify(ev.target.value));
    this.sharedService.setSelectedMode(ev.target.value);
  }

  handleNumberOfCardsChange(ev: any) {
    //console.log('Current value:', JSON.stringify(ev.target.value));
    this.sharedService.setSelectedNumberOfCards(ev.target.value);
  }

  handleValueTypeChange(ev: any) {
    //console.log('Current value:', JSON.stringify(ev.target.value));
    this.sharedService.setSelectedValueType(ev.target.value);
  }

  handleValueDistributionChange(ev: any) {
    //console.log('Current value:', JSON.stringify(ev.target.value));
    this.sharedService.setSelectedValueDistribution(ev.target.value);
  } 

  handleWorkshopModeChange(ev: any) {
    if(ev.target.value == 1) {
      this.http.get(this.baseUrl + '/available').pipe(
        catchError((error) => {
        this.sharedService.setSelectedWorkshopMode(0);
        return of(false); 
      })
      ).subscribe((response: any) => {
        const available = response['available'];
        if(available) {
          this.http.get(this.baseUrl + '/getKey/').subscribe(async (response: any) => {
            const passphrase  = response['passphrase'];
            let enteredPassphrase = "";
            const alert = await this.alertController.create({
              header: "Gib das Passwort ein:",
              inputs: [{
                name: 'passphrase',
                type: 'password',
                placeholder: 'Passwort'
              }],
              backdropDismiss: false,
              buttons: [{
                text: 'Abbrechen',
                handler: () => {
                  this.sharedService.setSelectedWorkshopMode(0);
                }
              },
              {
                text: 'Senden',
                handler: async (data) => {
                  enteredPassphrase = data.passphrase;
                  if(enteredPassphrase == passphrase) {
                    this.sharedService.setSelectedWorkshopMode(1);
                  } else {
                    const alert = await this.alertController.create({
                      header: "Falsches Passwort",
                      message: "Das eingegebene Passwort ist falsch. Bitte versuche es erneut.",
                      buttons: ["Ok"]
                    });
                    await alert.present();
                    this.sharedService.setSelectedWorkshopMode(0);
                  }  
                }
              }],
            });
            await alert.present();
          });
          this.sharedService.setSelectedWorkshopMode(1);
        } else {
          this.sharedService.setSelectedWorkshopMode(0);
        }
      });
    }
    
  }
}
