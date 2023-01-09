import {Component, ElementRef, HostListener, OnInit, ViewChild} from '@angular/core';
import { FormControl } from '@angular/forms';
import {
  combineLatest, concatMap, from,
  map,
  Observable,
  of,
  startWith,
  switchMap,
  tap,
} from 'rxjs';
import { Message } from 'src/app/models/chat';
import { ProfileUser } from 'src/app/models/user-profile';
import { ChatsService } from 'src/app/services/chats.service';
import { UsersService } from 'src/app/services/users.service';
import {getDownloadURL, ref, uploadBytes} from "@angular/fire/storage";
import {MediaUploadService} from "../../services/media-upload.service";

@Component({
  selector: 'app-home',
  templateUrl: './home.component.html',
  styleUrls: ['./home.component.scss'],
})
export class HomeComponent implements OnInit {
  @ViewChild('endOfChat')
  endOfChat!: ElementRef;
  hiddenMessage= false;
  hiddenMenu = false;
  mobileFlag = false;
  chatId ='';
  file : any;
  urlRegex = /(https?:\/\/[^\s]+)/g;

  user$ = this.usersService.currentUserProfile$;
  myChats$ = this.chatsService.myChats$;

  searchControl = new FormControl('');
  messageControl = new FormControl('');
  chatListControl = new FormControl('');

  messages$: Observable<Message[]> | undefined;

  otherUsers$ = combineLatest([this.usersService.allUsers$, this.user$]).pipe(
    map(([users, user]) => users.filter((u) => u.uid !== user?.uid))
  );

  users$ = combineLatest([
    this.otherUsers$,
    this.searchControl.valueChanges.pipe(startWith('')),
  ]).pipe(
    map(([users, searchString]) => {
      return users.filter((u) =>
        u.displayName?.toLowerCase().includes(searchString.toLowerCase())
      );
    })
  );

  selectedChat$ = combineLatest([
    this.chatListControl.valueChanges,
    this.myChats$,
  ]).pipe(map(([value, chats]) => chats.find((c) => c.id === value[0])));

  constructor(
    private imageUploadService: MediaUploadService,
    private usersService: UsersService,
    private chatsService: ChatsService
  ) {}

  ngOnInit(): void {
    this.isMobile(window.innerWidth<900);

    this.messages$ = this.chatListControl.valueChanges.pipe(
      map((value) => value[0]),
      switchMap((chatId) => this.chatsService.getChatMessages$(chatId)),
      tap(() => {
        this.scrollToBottom();
      })
    );
    this.chatListControl.valueChanges.subscribe(value => this.chatId= value[0]);
  }

  createChat(user: ProfileUser) {
    this.chatsService
      .isExistingChat(user.uid)
      .pipe(
        switchMap((chatId) => {
          if (!chatId) {
            return this.chatsService.createChat(user);
          } else {
            return of(chatId);
          }
        })
      )
      .subscribe((chatId) => {
        this.chatListControl.setValue([chatId]);
      });
  }

  sendMessage() {
    const message = this.messageControl.value;
    const selectedChatId = this.chatListControl.value[0];
    let type = 'text';
    if(this.file != null){
      let type = this.file.type;
      console.log(this.file.type);
      this.imageUploadService
        // @ts-ignore
        .uploadImage(this.file, `images/chat/${this.chatId}/${this.file.name}`).subscribe(value => {
        if (selectedChatId) {
          this.chatsService
            .addChatMessage(selectedChatId, message,value,type)
            .subscribe(() => {
              this.scrollToBottom();
            });
          this.messageControl.setValue('');
        }
      });
    }else{
      if (message && selectedChatId) {
        this.chatsService
          .addChatMessage(selectedChatId, message,'',type)
          .subscribe(() => {
            this.scrollToBottom();
          });
        this.messageControl.setValue('');
      }
    }
    this.file = null;
  }

  scrollToBottom() {
    setTimeout(() => {
      if (this.endOfChat) {
        this.endOfChat.nativeElement.scrollIntoView({ behavior: 'smooth' });
      }
    }, 100);
  }

  changeState() {
    if(this.mobileFlag){
    if(this.hiddenMessage ){
      this.hiddenMenu = true;
      this.hiddenMessage = false;
    }else {
      this.hiddenMenu = false;
      this.hiddenMessage = true;
    }
    }
  }
  isMobile(value:boolean) {
    if (value) {
      this.mobileFlag = true;
      this.hiddenMessage = true;
      this.hiddenMenu = false;
    } else {
      this.mobileFlag = false;
      this.hiddenMessage = false;
      this.hiddenMenu = false;
    }
  }

  uploadImage($event: Event) {// zapis // ma się wykonywać przy wysyłaniu wiadomosći
    // @ts-ignore
    this.file = event.target.files[0];
        // @ts-ignore
        let file = event.target.files[0];
        this.imageUploadService
          // @ts-ignore
          .uploadImage(file, `images/chat/${this.chatId}/${file.name}`).subscribe();
  }
  isMediaType(target: string,type: string){
    if(typeof target !== 'undefined'){
      return target.includes(type);
    }
   return  false;
  }
  isNotRecType(target: string){
    if(typeof target !== 'undefined'){
      if(target.includes('image') || target.includes('video')|| target.includes('text')){
        return  false
      }
      return true;
    }
    return  false;
  }
    wrapLinks(text: string) {
    return text.replace(this.urlRegex, (url) => {
      return `<a href="${url}">${url}</a>`;
    });
  }


}
