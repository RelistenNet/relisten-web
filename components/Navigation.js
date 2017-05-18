import Link from 'next/link'
import { connect } from 'react-redux'

const bands = {"akron-family":{"name":"Akron/Family"},"american-babies":{"name":"American Babies"},"andrew-bird":{"name":"Andrew Bird"},"animal-collective":{"name":"Animal Collective"},"aru":{"name":"Aquarium Rescue Unit"},"aqueous":{"name":"Aqueous"},"assembly-of-dust":{"name":"Assembly of Dust"},"bela-fleck":{"name":"Bela Fleck and the Flecktones"},"ben-kweller":{"name":"Ben Kweller"},"duo":{"name":"Benevento Russo Duo","the":true},"bernie-worrell":{"name":"Bernie Worrell Orchestra","the":true},"the-big-wu":{"name":"The Big Wu"},"blues-traveler":{"name":"Blues Traveler"},"weir":{"name":"Bob Weir"},"the-breakfast":{"name":"The Breakfast"},"brothers-past":{"name":"Brothers Past"},"cabinet":{"name":"Cabinet"},"club-d-elf":{"name":"Club d'Elf"},"dark-star":{"name":"Dark Star Orchestra"},"the-dead":{"name":"The Dead"},"dead-and-company":{"name":"Dead & Company"},"the-decemberists":{"name":"The Decemberists"},"disco-biscuits":{"name":"Disco Biscuits","the":true},"dispatch":{"name":"Dispatch"},"donna-the-buffalo":{"name":"Donna the Buffalo"},"dopapod":{"name":"Dopapod"},"drive-by-truckers":{"name":"Drive-By Truckers","the":true},"egi":{"name":"EGi"},"elliott-smith":{"name":"Elliott Smith"},"everyone-orchestra":{"name":"Everyone Orchestra"},"fruition":{"name":"Fruition"},"fugazi":{"name":"Fugazi"},"furthur":{"name":"Furthur"},"g-nome":{"name":"G-Nome Project","the":true},"g-love":{"name":"G. Love and Special Sauce"},"garage-a-trois":{"name":"Garage A Trois"},"god-street-wine":{"name":"God Street Wine"},"godspeed-you-black-emperor":{"name":"Godspeed You Black Emperor!"},"grace-potter":{"name":"Grace Potter"},"grateful-dead":{"name":"Grateful Dead","the":true},"greensky-bluegrass":{"name":"Greensky Bluegrass"},"guster":{"name":"Guster"},"the-heavy-pets":{"name":"The Heavy Pets"},"holly-bowling":{"name":"Holly Bowling"},"stringdusters":{"name":"Infamous Stringdusters","the":true},"jack-johnson":{"name":"Jack Johnson"},"jauntee":{"name":"The Jauntee"},"jazz-mandolin-project":{"name":"Jazz Mandolin Project","the":true},"jerry-joseph":{"name":"Jerry Joseph and the Jackmormons"},"joe-russos-almost-dead":{"name":"Joe Russo's Almost Dead"},"john-kadlecik":{"name":"John Kadlecik"},"john-popper":{"name":"John Popper"},"keller-williams":{"name":"Keller Williams"},"kung-fu":{"name":"Kung Fu"},"kvhw":{"name":"KVHW"},"leftover-salmon":{"name":"Leftover Salmon"},"lettuce":{"name":"Lettuce"},"little-feat":{"name":"Little Feat"},"lotus":{"name":"Lotus"},"marco":{"name":"Marco Benevento"},"matisyahu":{"name":"Matisyahu"},"matt-pond-pa":{"name":"Matt Pond PA"},"max-creek":{"name":"Max Creek"},"moe":{"name":"moe."},"mogwai":{"name":"Mogwai"},"the-motet":{"name":"The Motet"},"mmj":{"name":"My Morning Jacket"},"the-new-deal":{"name":"The New Deal"},"new-mastersounds":{"name":"The New Mastersounds"},"percy-hill":{"name":"Percy Hill"},"phil-lesh":{"name":"Phil Lesh and Friends"},"phish":{"name":"Phish","the":true},"radiators":{"name":"The Radiators"},"railroad-earth":{"name":"Railroad Earth"},"raq":{"name":"Raq"},"ratdog":{"name":"Ratdog"},"ryan-adams":{"name":"Ryan Adams"},"shafty":{"name":"Shafty"},"smashing-pumpkins":{"name":"Smashing Pumpkins","the":true},"sts9":{"name":"Sound Tribe Sector 9"},"spafford":{"name":"Spafford"},"spoon":{"name":"Spoon"},"steve-kimock":{"name":"Steve Kimock"},"steve-kimock-band":{"name":"Steve Kimock Band","the":true},"strangefolk":{"name":"Strangefolk"},"sci":{"name":"String Cheese Incident","the":true},"tea-leaf-green":{"name":"Tea Leaf Green"},"ted-leo":{"name":"Ted Leo and the Pharmacists"},"tedeschi-trucks":{"name":"Tedeschi Trucks Band","the":true},"tenacious-d":{"name":"Tenacious D"},"twiddle":{"name":"Twiddle"},"umphreys":{"name":"Umphrey's McGee"},"vulfpeck":{"name":"Vulfpeck"},"the-walkmen":{"name":"The Walkmen"},"war-on-drugs":{"name":"The War on Drugs"},"warren-zevon":{"name":"Warren Zevon"},"ween":{"name":"Ween"},"the-werks":{"name":"The Werks"},"white-denim":{"name":"White Denim"},"yonder":{"name":"Yonder Mountain String Band"},"zebu":{"name":"Zebu"},"zero":{"name":"Zero"}}

const Navigation = ({ app }) => (
  <div className="navigation">
    <style jsx>{`
      .navigation {
        display: flex;
        flex-direction: row;
        height: 50px;
        border-bottom: 1px solid #bbb;
      }

      .navigation > span, .navigation a {
        height: 100%;
        font-size: 1.4em;
        text-align: center;
        text-transform: uppercase;
        font-weight: bold;

        display: flex;
        flex-direction: column;
        justify-content: center;
      }

      .right {
        height: 100%;
        margin-left: auto;
        display: flex;
      }

      .right a {
        width: 100px;
      }

      a {
        width: 120px;
        padding: 0 5px;
      }

      .artist, .default {
        padding: 0 5px;
        width: auto;
      }

      a:hover {
        background: #333;
        color: #FFF;
      }

    `}</style>
    <Link href="/" prefetch><a>Relisten</a></Link>
    <span>to</span>
    {bands[app.artistSlug] ?
      <Link href="/" as={`/${app.artistSlug}`}>
        <a className="artist">{bands[app.artistSlug].the ? 'the ' : ''}{bands[app.artistSlug].name}</a>
      </Link> :
      <span className="default">1,028,334 songs on 60,888 tapes from 102 bands</span>
    }
    <div className="right">
      <Link href="/about" prefetch><a>About</a></Link>
      <Link href="/ios" prefetch><a>iOS</a></Link>
    </div>
  </div>
)


const mapStateToProps = ({ app }) => {
  return {
    app
  }
}

export default connect(mapStateToProps)(Navigation)
