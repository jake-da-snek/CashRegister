import { Component, Inject } from '@angular/core';
import { Angular5Csv } from 'angular5-csv/Angular5-csv';


@Component({
  selector: 'app-calculator',
  templateUrl: './calculator.component.html',
  styleUrls: ['./calculator.component.css']
})
export class CalculatorComponent {

  constructor(@Inject('Denominations') public denominations: any[]) { }

  read() {
    /* this function is responsible for reading the data from the uploaded file
    as well as parsing and passing the raw values to the appropriate calculation
    function */
    var resultArray = [];
    var input: any = event.target;
    var reader = new FileReader();
    reader.onload = () => {
        var rawData = reader.result;
        let transactions = rawData.split("\n");   // returns an array of the owed/paid sets
        for (var i = 0; i < transactions.length; i++) {
          if (transactions[i].length != 1 && transactions[i] != "") {   // checks that the string is NOT empty (parsing can create empty strings)
            var splitTransactions = transactions[i].split(",");
            var change = splitTransactions[1] - splitTransactions[0];
            change = Math.round(change * 100) / 100;    // avoids TypeScript decimal bugs
            if (Math.sign(change) == -1) {    // exception for insufficent funds
              resultArray.push([{name: "insufficent funds"}]);
              continue;
            } else if (change == 0){    // exception for no change due
              resultArray.push([{name: "no change due"}]);
              continue;
            }
            if ((splitTransactions[0] * 100) % 3 === 0) {   // checks if the amount owed is divisible by 3
              var randomResults = this.calculateRandom(change);    // passes values to random calculator
              resultArray.push(randomResults);
            } else {
              var standardResults = this.calculateStandard(change);    // passes values to standard calculator
              resultArray.push(standardResults);
            }
          }
        }
        this.write(resultArray);    // pass the results of the calculation to be written to a CSV
    }
    reader.readAsText(input.files[0]);    // triggers the file reader
  }


  calculateStandard(change) {
    /* this function calculates the standard change for a transaction (most efficent denominations) */
    var result = this.denominations.reduce(function(accumulator, currentDenomination) {   // iterates through the denomination object from top to bottom
      if (change >= currentDenomination.value) {
        var currentValue = 0.00;    // the amount of coins/bills for each denomination
        while (change >= currentDenomination.value) {
          currentValue ++;
          change -= currentDenomination.value;
          change = Math.round(change * 100) / 100;   // prevents nasty decimal issues in TypeScript
        }
        if (currentValue > 1) {   // checks to see if the plural denomination name should be used or not
          accumulator.push({name: currentDenomination.plural, amount: currentValue});
        } else {
          accumulator.push({name: currentDenomination.name, amount: currentValue});
        }
        return accumulator;
      } else {
        return accumulator;
      }
    }, []);   // the empty array is the initial accumulator
    return result;
  }


  calculateRandom(change) {
    /* this function calculates the randomized denominations if the amount
    due on a transaction is divisible by 3. It's not the most efficent randomization
    system, but it works well */
    let result = [];
    var totalValue = 0;
    while (totalValue < change) {
      var sameDenominationStatus = false;   // resets the same denomination catch for each iteration
      var randomDenomination = this.denominations[Math.floor(Math.random() * this.denominations.length)];   // selects a random denomination
      if (change >= randomDenomination.value) {   // makes sure the denomination is valid
        var denominationAmount = Math.floor((Math.random() * 10) + 1); // picks a random amount of the random denomination
        if (change >= (denominationAmount * randomDenomination.value) + totalValue && denominationAmount != 0) {    // makes sure the values are still valid
          totalValue += denominationAmount * randomDenomination.value;
          totalValue = Math.round(totalValue * 100) / 100;   // prevents nasty decimal issues
          for (var i = 0; i < result.length; i++) {   // combines duplicate denominations
            if (result[i].name == randomDenomination.name || result[i].name == randomDenomination.plural) {
              result[i].amount += denominationAmount;
              if (result[i].amount > 1) {   // checks to see if the denomination needs to switch to plural
                result[i].name = randomDenomination.plural;
              }
              var sameDenominationStatus = true;
            }
          }
          if (sameDenominationStatus != true) {   // if the denomination is not a duplicate, we add it to the array
            if (denominationAmount > 1) {   // checks to use singular or plural name
              result.push({name: randomDenomination.plural, amount: denominationAmount, value: randomDenomination.value});
            } else {
              result.push({name: randomDenomination.name, amount: denominationAmount, value: randomDenomination.value});
            }
          }
        }
      }
    }
    result = result.sort(function(a, b) {return b.value - a.value});    // sort the denominations in descending order
    return result;
  }


  write(resultArray) {
    /* this function is responsible for concatenating the results into
    human readable format and then exporting the answers into a CSV */
    var options = {   // options for CSV export package
      headers: ["Transaction Number", "Change Due"]
    }
    let alertStatus = false;
    let stringAnswers = [];    // init our array of final, human readable answers
    let transactionCounter = 0;    // matches each transaction with the appropriate answer line
    for (var i = 0; i < resultArray.length; i++) {    // each iteration is one transaction
      transactionCounter ++;
      let transactionString = "";
      for (var x = 0; x < resultArray[i].length; x++) {   // each iteration is one denomination of a transaction
        if (resultArray[i][x].name == "insufficent funds" || resultArray[i][x].name == "no change due") {
          var string: any = resultArray[i][x].name;
          alertStatus = true;
        } else {
          var string: any = resultArray[i][x].amount + " " + resultArray[i][x].name;
        }
        transactionString = transactionString + string + ",";
      }
      stringAnswers.push({transaction: transactionCounter, string: transactionString});
      var fileInputField = document.getElementById("file_input") as HTMLInputElement;   // black magic to avoid TypeScript quirk
      fileInputField.value = "";
    }
    new Angular5Csv(stringAnswers, 'Results', options);   // third party package to generate the output CSV
    if (alertStatus == true) {
      alert("One or more of your transactions were invalid. Check the results file for details.");
    }
  }

}
